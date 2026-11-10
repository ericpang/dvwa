import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { resolveEffectiveSecurityLevel } from "@/lib/auth";
import { queryDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const body = await req.json().catch(() => ({}));

  // Step 2: Complete password reset using token
  if (body.token && body.newPassword) {
    const { rows } = await queryDb(
      "SELECT id, username, email FROM users WHERE reset_token = $1",
      [String(body.token)],
      { endpoint: "/api/auth/reset-password", vulnId: "AUTH-04" }
    );
    if (!rows[0]) {
      return NextResponse.json(
        { error: "Invalid or expired password reset token." },
        { status: 400 }
      );
    }

    await queryDb(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [String(body.newPassword), rows[0].id],
      { endpoint: "/api/auth/reset-password", vulnId: "AUTH-04" }
    );

    return NextResponse.json({
      ok: true,
      message: `Password for ${rows[0].email} has been reset via token '${body.token}'.`,
    });
  }

  // Step 1: Request password reset token
  const email = String(body.email || "").trim();
  const { rows } = await queryDb(
    "SELECT id, username, email FROM users WHERE email = $1",
    [email],
    { endpoint: "/api/auth/reset-password", vulnId: "AUTH-04" }
  );

  if (!rows[0]) {
    if (level === "low" || level === "medium") {
      return NextResponse.json(
        {
          error: `Account Enumeration (AUTH-01/04): No user found with email '${email}'`,
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      ok: true,
      message: "If that account exists, a password reset link has been sent.",
    });
  }

  const user = rows[0];
  // AUTH-04: Predictable token in Low/Medium vs CSPRNG in Fixed
  const resetToken =
    level === "fixed"
      ? crypto.randomBytes(24).toString("hex")
      : `reset_${1000 + Number(user.id)}`;

  await queryDb("UPDATE users SET reset_token = $1 WHERE id = $2", [
    resetToken,
    user.id,
  ]);

  // AUTH-04: Host header injection when constructing password reset link
  const poisonedHost =
    level === "fixed"
      ? "localhost:3000"
      : req.headers.get("x-forwarded-host") ||
        req.headers.get("host") ||
        "localhost:3000";

  const resetLink = `http://${poisonedHost}/login?reset_token=${resetToken}`;

  return NextResponse.json({
    ok: true,
    message: "Password reset link generated.",
    // Leaked in response for easy testing and scanner verification
    debugResetPreview:
      level === "fixed"
        ? undefined
        : {
            predictableToken: resetToken,
            generatedResetUrl: resetLink,
            hostHeaderUsed: poisonedHost,
          },
  });
}
