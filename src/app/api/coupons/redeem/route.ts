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
  const code = String(body.code || "")
    .trim()
    .toUpperCase();

  if (!code) {
    return NextResponse.json(
      { error: "Coupon code is required" },
      { status: 400 }
    );
  }

  if (level === "fixed") {
    // Fixed mode: Atomic conditional UPDATE prevents TOCTOU race conditions
    const { rows } = await queryDb(
      `UPDATE coupons
       SET times_used = times_used + 1
       WHERE code = $1 AND times_used < max_uses
       RETURNING id, code, discount_amount, times_used, max_uses`,
      [code],
      { endpoint: "/api/coupons/redeem", vulnId: "BIZ-02 (Fixed Atomic)" }
    );

    if (!rows[0]) {
      return NextResponse.json(
        {
          error: `Coupon '${code}' is invalid or has already reached its usage limit (Atomic lock enforced).`,
        },
        { status: 400 }
      );
    }

    const coupon = rows[0];
    const { rows: updatedUser } = await queryDb(
      `UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance`,
      [Number(coupon.discount_amount), userId]
    );

    return NextResponse.json({
      ok: true,
      coupon,
      creditedAmount: Number(coupon.discount_amount),
      newWalletBalance: Number(updatedUser[0]?.wallet_balance ?? 0),
    });
  }

  // BIZ-02 Vulnerable TOCTOU Race Condition (Low / Medium / High):
  // Step 1: Read current usage count (Time-of-Check)
  const { rows: coupons } = await queryDb(
    "SELECT * FROM coupons WHERE code = $1",
    [code],
    { endpoint: "/api/coupons/redeem", vulnId: "BIZ-02 (TOCTOU Check)" }
  );

  const coupon = coupons[0];
  if (!coupon) {
    return NextResponse.json(
      { error: `Coupon code '${code}' not found.` },
      { status: 404 }
    );
  }

  if (Number(coupon.times_used) >= Number(coupon.max_uses)) {
    return NextResponse.json(
      {
        error: `Coupon '${code}' has already been fully redeemed (${coupon.times_used}/${coupon.max_uses}). Reset DB to test again.`,
      },
      { status: 400 }
    );
  }

  // Step 2: Artificial 200ms async delay creating a wide race window for parallel requests
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Step 3: Non-atomic update (Time-of-Use)
  await queryDb(
    "UPDATE coupons SET times_used = times_used + 1 WHERE id = $1",
    [coupon.id],
    { endpoint: "/api/coupons/redeem", vulnId: "BIZ-02 (TOCTOU Use)" }
  );

  const { rows: updatedUser } = await queryDb(
    "UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance",
    [Number(coupon.discount_amount), userId]
  );

  return NextResponse.json({
    ok: true,
    vulnerability: "BIZ-02: TOCTOU Race Condition Window Exploitable",
    creditedAmount: Number(coupon.discount_amount),
    newWalletBalance: Number(updatedUser[0]?.wallet_balance ?? 0),
    couponCode: code,
  });
}
