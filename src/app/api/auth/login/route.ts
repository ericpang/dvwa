import { NextRequest, NextResponse } from "next/server";
import {
  createJwtToken,
  issueSession,
  resolveEffectiveSecurityLevel,
} from "@/lib/auth";
import { queryDb } from "@/lib/db";

const failedLoginAttempts = new Map<string, number>();

export async function POST(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "");
  const password = String(body.password || "");

  // Quick-login helper for Pentester HUD 1-click switch
  if (body.quickLoginUserId) {
    const { rows } = await queryDb(
      "SELECT id, username, email, role, wallet_balance, full_name FROM users WHERE id = $1",
      [Number(body.quickLoginUserId)],
      { endpoint: "/api/auth/login (Quick Switch)" }
    );
    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const sid = await issueSession(user.id, level);
    const jwt = createJwtToken(user, level);
    const res = NextResponse.json({
      ok: true,
      user,
      sessionToken: sid,
      jwtToken: jwt,
      securityLevel: level,
    });
    res.cookies.set("vulnlab_sid", sid, {
      path: "/",
      httpOnly: level === "fixed" || level === "high",
      sameSite: level === "fixed" ? "strict" : "lax",
    });
    return res;
  }

  // AUTH-02: Enforce brute-force lockout only in Fixed / High modes
  if (level === "fixed" || level === "high") {
    const attempts = failedLoginAttempts.get(email) || 0;
    if (attempts >= 5) {
      return NextResponse.json(
        {
          error:
            "Account temporarily locked due to too many failed login attempts (AUTH-02 protection active).",
        },
        { status: 429 }
      );
    }
  }

  try {
    let matchedUser: any = null;

    if (level === "low") {
      // INJ-01: Raw string interpolation enabling SQL Injection Auth Bypass (' OR '1'='1)
      const rawSql = `SELECT id, username, email, password_hash, role, wallet_balance, full_name FROM users WHERE email = '${email}' AND password_hash = '${password}'`;
      const { rows } = await queryDb(rawSql, undefined, {
        endpoint: "/api/auth/login",
        vulnId: "INJ-01 / AUTH-01",
      });
      matchedUser = rows[0];

      // If raw SQL didn't match, perform secondary lookup to demonstrate AUTH-01 Account Enumeration
      if (!matchedUser && !email.includes("'")) {
        const userCheck = await queryDb(
          `SELECT id, username, email, password_hash FROM users WHERE email = '${email}'`,
          undefined,
          { endpoint: "/api/auth/login", vulnId: "AUTH-01" }
        );
        if (userCheck.rows.length === 0) {
          return NextResponse.json(
            {
              error: `Account Enumeration (AUTH-01): User account '${email}' does not exist in database.`,
              exists: false,
            },
            { status: 404 }
          );
        } else {
          return NextResponse.json(
            {
              error: `Account Enumeration (AUTH-01): Account '${email}' (user_id=${userCheck.rows[0].id}) exists, but password is incorrect.`,
              exists: true,
              leakedUserId: userCheck.rows[0].id,
            },
            { status: 401 }
          );
        }
      }
    } else if (level === "medium") {
      // Medium mode: Naive replace of "OR" (case-sensitive), bypassable with "or" or "'=''"
      const filteredEmail = email.replace(/OR/g, "");
      const rawSql = `SELECT id, username, email, password_hash, role, wallet_balance, full_name FROM users WHERE email = '${filteredEmail}' AND password_hash = '${password}'`;
      const { rows } = await queryDb(rawSql, undefined, {
        endpoint: "/api/auth/login",
        vulnId: "INJ-01 (Medium)",
      });
      matchedUser = rows[0];
    } else {
      // High / Fixed mode: Parameterized query prevents SQL injection
      const { rows } = await queryDb(
        "SELECT id, username, email, password_hash, role, wallet_balance, full_name FROM users WHERE email = $1",
        [email],
        { endpoint: "/api/auth/login", vulnId: "AUTH-LOGIN" }
      );
      if (rows[0] && rows[0].password_hash === password) {
        matchedUser = rows[0];
      }
    }

    if (!matchedUser) {
      failedLoginAttempts.set(email, (failedLoginAttempts.get(email) || 0) + 1);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    failedLoginAttempts.delete(email);

    // SESS-02: Session fixation via query param or existing cookie in low/medium
    const preExistingSid =
      req.nextUrl.searchParams.get("vulnlab_sid") ||
      body.fixedSessionToken ||
      (level === "low" ? req.cookies.get("vulnlab_sid")?.value : null);

    const sid = await issueSession(matchedUser.id, level, preExistingSid);
    const jwt = createJwtToken(matchedUser, level);

    const response = NextResponse.json({
      ok: true,
      user: {
        id: matchedUser.id,
        username: matchedUser.username,
        email: matchedUser.email,
        role: matchedUser.role,
        wallet_balance: Number(matchedUser.wallet_balance),
        full_name: matchedUser.full_name,
      },
      sessionToken: sid,
      jwtToken: jwt,
      cookieFlags: {
        httpOnly: level === "fixed" || level === "high",
        sameSite: level === "fixed" ? "strict" : "lax",
      },
    });

    // SESS-03: Insecure cookie flags in low/medium
    response.cookies.set("vulnlab_sid", sid, {
      path: "/",
      httpOnly: level === "fixed" || level === "high",
      sameSite: level === "fixed" ? "strict" : "lax",
    });

    return response;
  } catch (err: any) {
    // REC-03: Verbose database error leakage in Low/Medium
    if (level === "low" || level === "medium") {
      return NextResponse.json(
        {
          error: "PostgreSQL Database Query Exception (REC-03)",
          pgMessage: err?.message || String(err),
          attemptedInput: { email, password },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Authentication error occurred." },
      { status: 500 }
    );
  }
}
