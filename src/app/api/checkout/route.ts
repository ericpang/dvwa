import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  resolveEffectiveSecurityLevel,
} from "@/lib/auth";
import { queryDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const currentUser = await getAuthenticatedUser(req);
  const body = await req.json().catch(() => ({}));

  const userId = Number(body.userId || currentUser?.id || 1);
  const items = Array.isArray(body.items) ? body.items : [];
  const shippingAddress = String(
    body.shipping_address ||
      currentUser?.shipping_address ||
      "742 Evergreen Terrace, Springfield"
  );
  const skipPaymentCheck = Boolean(body.skipPaymentCheck);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Cart items cannot be empty" },
      { status: 400 }
    );
  }

  const { rows: users } = await queryDb(
    "SELECT * FROM users WHERE id = $1",
    [userId]
  );
  const buyer = users[0];
  if (!buyer) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let calculatedTotal = 0;
  const resolvedItems: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
  }> = [];

  for (const item of items) {
    const pid = Number(item.product_id || 1);
    const qty = Number(item.quantity ?? 1);
    const { rows: prodRows } = await queryDb(
      "SELECT * FROM products WHERE id = $1",
      [pid]
    );
    const dbProduct = prodRows[0];
    if (!dbProduct) continue;

    if (level === "fixed" || level === "high") {
      // Fixed mode: Reject negative/zero quantities and always use server-side database price
      if (qty <= 0 || !Number.isInteger(qty)) {
        return NextResponse.json(
          {
            error:
              "Business Logic Blocked (BIZ-01 Fixed): Quantity must be a positive integer.",
          },
          { status: 400 }
        );
      }
      const serverPrice = Number(dbProduct.price);
      calculatedTotal += qty * serverPrice;
      resolvedItems.push({
        product_id: pid,
        product_name: dbProduct.name,
        quantity: qty,
        unit_price: serverPrice,
      });
    } else {
      // BIZ-01 Vulnerable: Trusts client-supplied unit_price and allows negative quantity!
      const clientPrice =
        item.unit_price !== undefined
          ? Number(item.unit_price)
          : Number(dbProduct.price);
      calculatedTotal += qty * clientPrice;
      resolvedItems.push({
        product_id: pid,
        product_name: dbProduct.name,
        quantity: qty,
        unit_price: clientPrice,
      });
    }
  }

  // BIZ-03: Workflow bypass allows skipping wallet balance check if skipPaymentCheck=true in Low/Medium
  if (
    (level === "fixed" || level === "high" || !skipPaymentCheck) &&
    Number(buyer.wallet_balance) < calculatedTotal
  ) {
    return NextResponse.json(
      {
        error: `Insufficient wallet balance ($${Number(buyer.wallet_balance).toFixed(2)}) for order total $${calculatedTotal.toFixed(2)}. (Hint: Try BIZ-01 price tampering or BIZ-03 skipPaymentCheck=true)`,
      },
      { status: 400 }
    );
  }

  const { rows: maxOrderRows } = await queryDb(
    "SELECT COALESCE(MAX(id), 1003) AS max_id FROM orders"
  );
  const nextOrderId = Number(maxOrderRows[0]?.max_id || 1003) + 1;

  await queryDb(
    `INSERT INTO orders (id, user_id, total_amount, status, shipping_address, customer_name, customer_email, customer_phone, credit_card_last4, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      nextOrderId,
      buyer.id,
      calculatedTotal,
      skipPaymentCheck ? "paid (workflow-bypassed)" : "paid",
      shippingAddress,
      buyer.full_name || buyer.username,
      buyer.email,
      buyer.phone || "+1-555-0100",
      "Wallet",
      body.notes || "Standard checkout",
    ],
    { endpoint: "/api/checkout", vulnId: "BIZ-01 / BIZ-03" }
  );

  for (const ri of resolvedItems) {
    await queryDb(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
       VALUES ($1, $2, $3, $4, $5)`,
      [nextOrderId, ri.product_id, ri.product_name, ri.quantity, ri.unit_price]
    );
  }

  // Deduct (or credit if calculatedTotal is negative!) wallet balance unless workflow bypassed
  const balanceDelta = skipPaymentCheck && level !== "fixed" ? 0 : calculatedTotal;
  const { rows: updatedBuyer } = await queryDb(
    "UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2 RETURNING wallet_balance",
    [balanceDelta, buyer.id]
  );

  return NextResponse.json({
    ok: true,
    orderId: nextOrderId,
    totalCharged: calculatedTotal,
    workflowBypassed: skipPaymentCheck && level !== "fixed",
    newWalletBalance: Number(updatedBuyer[0]?.wallet_balance ?? 0),
    items: resolvedItems,
  });
}
