import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  resolveEffectiveSecurityLevel,
} from "@/lib/auth";
import { queryDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const currentUser = await getAuthenticatedUser(req);

  // AUTHZ-03: In Low mode, no server-side admin check is enforced (Forced Browsing)
  if (level !== "low") {
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        {
          error: `Admin Access Denied (${level.toUpperCase()} Mode): Admin role required. (Hint: In Medium mode, try POST with header X-HTTP-Method-Override: GET)`,
        },
        { status: 403 }
      );
    }
  }

  const { rows: users } = await queryDb(
    "SELECT id, username, email, password_hash, role, wallet_balance, full_name, api_key, reset_token FROM users ORDER BY id ASC",
    undefined,
    { endpoint: "GET /api/admin/users", vulnId: "AUTHZ-03 (Forced Browsing)" }
  );

  const { rows: reviews } = await queryDb(
    "SELECT * FROM reviews ORDER BY id DESC"
  );

  return NextResponse.json({
    vulnerability: "AUTHZ-03: Forced Browsing / Broken Admin Access Control",
    securityLevel: level,
    users,
    reviews,
  });
}

export async function POST(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const currentUser = await getAuthenticatedUser(req);
  const methodOverride = (
    req.headers.get("x-http-method-override") || ""
  ).toUpperCase();

  // AUTHZ-03: In Low and Medium mode, X-HTTP-Method-Override bypasses standard GET/DELETE RBAC checks!
  if (level === "fixed" || level === "high") {
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin role required" },
        { status: 403 }
      );
    }
  }

  if (methodOverride === "GET") {
    const { rows: users } = await queryDb(
      "SELECT id, username, email, password_hash, role, wallet_balance, api_key FROM users ORDER BY id ASC",
      undefined,
      {
        endpoint: "POST /api/admin/users (X-HTTP-Method-Override: GET)",
        vulnId: "AUTHZ-03 (Method Tampering)",
      }
    );
    return NextResponse.json({
      ok: true,
      methodOverrideUsed: "GET",
      users,
    });
  }

  if (methodOverride === "DELETE") {
    const body = await req.json().catch(() => ({}));
    const targetId = Number(body.userId || 0);
    if (targetId > 3) {
      await queryDb("DELETE FROM users WHERE id = $1", [targetId]);
    }
    return NextResponse.json({
      ok: true,
      methodOverrideUsed: "DELETE",
      message: `Method Override DELETE executed for user #${targetId}`,
    });
  }

  return NextResponse.json(
    {
      error:
        "Unsupported action. Supply header 'X-HTTP-Method-Override: GET' or 'DELETE'.",
    },
    { status: 400 }
  );
}
