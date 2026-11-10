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

  const fromUserId = Number(body.fromUserId || currentUser?.id || 1);
  const toUsername = String(body.toUsername || "").trim();
  const amount = Number(body.amount || 0);

  // SESS-03: Require CSRF token in Fixed / High mode
  if (level === "fixed" || level === "high") {
    const csrfToken = req.headers.get("x-csrf-token") || body.csrfToken;
    if (csrfToken !== "csrf_valid_nexus_token_2026") {
      return NextResponse.json(
        {
          error:
            "CSRF Protection (SESS-03 Fixed): Missing or invalid X-CSRF-Token header.",
        },
        { status: 403 }
      );
    }
    if (amount <= 0) {
      return NextResponse.json(
        { error: "Transfer amount must be positive." },
        { status: 400 }
      );
    }
  }

  const { rows: recipients } = await queryDb(
    "SELECT id, username, wallet_balance FROM users WHERE username = $1 OR email = $1",
    [toUsername]
  );
  if (!recipients[0]) {
    return NextResponse.json(
      { error: `Recipient '${toUsername}' not found.` },
      { status: 404 }
    );
  }

  const recipient = recipients[0];

  // BIZ-01 / SESS-03: In Low/Medium mode, negative amounts are allowed (stealing funds from recipient!) and no CSRF token is checked
  await queryDb(
    "UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2",
    [amount, fromUserId],
    { endpoint: "/api/wallet/transfer", vulnId: "SESS-03 (CSRF)" }
  );

  await queryDb(
    "UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2",
    [amount, recipient.id]
  );

  const { rows: updatedSender } = await queryDb(
    "SELECT id, username, wallet_balance FROM users WHERE id = $1",
    [fromUserId]
  );

  return NextResponse.json({
    ok: true,
    message: `Transferred $${amount.toFixed(2)} to ${recipient.username}`,
    newBalance: Number(updatedSender[0]?.wallet_balance ?? 0),
    csrfVerified: level === "fixed" || level === "high",
  });
}
