import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  resolveEffectiveSecurityLevel,
} from "@/lib/auth";
import { queryDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params;
  const level = await resolveEffectiveSecurityLevel(req);
  const currentUser = await getAuthenticatedUser(req);
  const numericOrderId = Number(orderId);

  const { rows: orders } = await queryDb(
    "SELECT * FROM orders WHERE id = $1",
    [numericOrderId],
    { endpoint: `/api/orders/${orderId}`, vulnId: "AUTHZ-01 (IDOR)" }
  );

  const order = orders[0];
  if (!order) {
    return NextResponse.json(
      { error: `Order #${orderId} not found.` },
      { status: 404 }
    );
  }

  // AUTHZ-01: Enforce ownership verification ONLY in Fixed / High mode
  if (level === "fixed" || level === "high") {
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required to view orders." },
        { status: 401 }
      );
    }
    if (
      currentUser.role !== "admin" &&
      Number(order.user_id) !== Number(currentUser.id)
    ) {
      return NextResponse.json(
        {
          error: `IDOR Blocked (${level.toUpperCase()} Mode): Authenticated user #${currentUser.id} (${currentUser.username}) is not authorized to access Order #${orderId} belonging to user #${order.user_id}.`,
        },
        { status: 403 }
      );
    }
  }

  const { rows: items } = await queryDb(
    "SELECT * FROM order_items WHERE order_id = $1",
    [numericOrderId]
  );

  return NextResponse.json({
    order,
    items,
    securityLevel: level,
    idorNotice:
      currentUser && Number(order.user_id) !== Number(currentUser.id)
        ? `IDOR Exploited (AUTHZ-01): You are logged in as user #${currentUser.id} (${currentUser.username}) viewing Order #${order.id} owned by user #${order.user_id} (${order.customer_name})!`
        : undefined,
  });
}
