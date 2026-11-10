import { NextRequest, NextResponse } from "next/server";
import {
  createJwtToken,
  issueSession,
  resolveEffectiveSecurityLevel,
} from "@/lib/auth";
import { queryDb } from "@/lib/db";

const WEAK_PASSWORDS = new Set([
  "123456",
  "password",
  "12345678",
  "qwerty",
  "admin",
  "1",
  "a",
]);

export async function POST(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim();
  const password = String(body.password || "");

  if (!username || !email || !password) {
    return NextResponse.json(
      { error: "Username, email, and password are required." },
      { status: 400 }
    );
  }

  // AUTH-03: Enforce password policy only in Fixed / High mode
  if (level === "fixed" || level === "high") {
    if (password.length < 10 || WEAK_PASSWORDS.has(password.toLowerCase())) {
      return NextResponse.json(
        {
          error:
            "Weak Password Rejected (AUTH-03 Fixed): Password must be at least 10 characters and not a common dictionary password.",
        },
        { status: 400 }
      );
    }
  }

  try {
    // Allow mass-assigned role during registration in Low mode (AUTHZ-02)
    const assignedRole =
      level === "low" && body.role ? String(body.role) : "customer";

    const { rows } = await queryDb(
      `INSERT INTO users (username, email, password_hash, role, wallet_balance, full_name)
       VALUES ($1, $2, $3, $4, 100.00, $5)
       RETURNING id, username, email, role, wallet_balance, full_name`,
      [username, email, password, assignedRole, body.full_name || username],
      { endpoint: "/api/auth/register", vulnId: "AUTH-03" }
    );

    const newUser = rows[0];
    const sid = await issueSession(newUser.id, level);
    const jwt = createJwtToken(newUser, level);

    const res = NextResponse.json({
      ok: true,
      user: newUser,
      sessionToken: sid,
      jwtToken: jwt,
    });
    res.cookies.set("vulnlab_sid", sid, {
      path: "/",
      httpOnly: level === "fixed" || level === "high",
      sameSite: level === "fixed" ? "strict" : "lax",
    });
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Registration failed" },
      { status: 400 }
    );
  }
}
