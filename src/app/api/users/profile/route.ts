import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  resolveEffectiveSecurityLevel,
} from "@/lib/auth";
import { queryDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const currentUser = await getAuthenticatedUser(req);
  const requestedId = Number(
    req.nextUrl.searchParams.get("userId") || currentUser?.id || 1
  );

  if (level === "fixed" || level === "high") {
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    if (currentUser.role !== "admin" && currentUser.id !== requestedId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot view another user's profile." },
        { status: 403 }
      );
    }
  }

  const { rows: users } = await queryDb(
    "SELECT id, username, email, role, wallet_balance, full_name, shipping_address, phone, api_key FROM users WHERE id = $1",
    [requestedId],
    { endpoint: "/api/users/profile", vulnId: "AUTHZ-01" }
  );

  const { rows: orders } = await queryDb(
    "SELECT id, total_amount, status, created_at FROM orders WHERE user_id = $1 ORDER BY id DESC",
    [requestedId]
  );

  const { rows: uploads } = await queryDb(
    "SELECT id, filename, content_type, created_at FROM uploaded_files WHERE user_id = $1 ORDER BY id DESC",
    [requestedId]
  );

  return NextResponse.json({
    profile: users[0] || null,
    orders,
    uploads,
    securityLevel: level,
  });
}

export async function PUT(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const currentUser = await getAuthenticatedUser(req);
  const body = await req.json().catch(() => ({}));

  const targetUserId =
    level === "low" || level === "medium"
      ? Number(body.userId || currentUser?.id || 1)
      : Number(currentUser?.id);

  if (!targetUserId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { rows: existing } = await queryDb(
    "SELECT * FROM users WHERE id = $1",
    [targetUserId]
  );
  if (!existing[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const user = existing[0];

  if (level === "fixed" || level === "high") {
    // Fixed mode: Strict allowlist of editable fields (full_name, shipping_address, phone) — blocks role & wallet_balance mass assignment
    if (body.role || body.wallet_balance !== undefined) {
      return NextResponse.json(
        {
          error:
            "Mass Assignment Blocked (AUTHZ-02 Fixed): Privileged fields 'role' and 'wallet_balance' cannot be modified by user profile requests.",
        },
        { status: 403 }
      );
    }

    const { rows } = await queryDb(
      `UPDATE users
       SET full_name = $1, shipping_address = $2, phone = $3
       WHERE id = $4
       RETURNING id, username, email, role, wallet_balance, full_name, shipping_address, phone`,
      [
        body.full_name ?? user.full_name,
        body.shipping_address ?? user.shipping_address,
        body.phone ?? user.phone,
        targetUserId,
      ],
      { endpoint: "PUT /api/users/profile", vulnId: "AUTHZ-02 (Fixed)" }
    );

    return NextResponse.json({
      ok: true,
      user: rows[0],
      securityLevel: level,
    });
  }

  // AUTHZ-02: Vulnerable Mass Assignment in Low / Medium mode — allows updating role='admin' and wallet_balance
  const newRole = body.role !== undefined ? String(body.role) : user.role;
  const newWallet =
    body.wallet_balance !== undefined
      ? Number(body.wallet_balance)
      : Number(user.wallet_balance);

  const { rows } = await queryDb(
    `UPDATE users
     SET full_name = $1, shipping_address = $2, phone = $3, email = $4, role = $5, wallet_balance = $6
     WHERE id = $7
     RETURNING id, username, email, role, wallet_balance, full_name, shipping_address, phone`,
    [
      body.full_name ?? user.full_name,
      body.shipping_address ?? user.shipping_address,
      body.phone ?? user.phone,
      body.email ?? user.email,
      newRole,
      newWallet,
      targetUserId,
    ],
    {
      endpoint: "PUT /api/users/profile",
      vulnId: "AUTHZ-02 (Mass Assignment)",
    }
  );

  return NextResponse.json({
    ok: true,
    user: rows[0],
    massAssignmentTriggered:
      body.role !== undefined || body.wallet_balance !== undefined,
    securityLevel: level,
  });
}
