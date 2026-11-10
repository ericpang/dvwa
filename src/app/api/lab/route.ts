import { NextRequest, NextResponse } from "next/server";
import {
  clearQueryLogs,
  ensureDbInitialized,
  getDbMode,
  getQueryLogs,
  getSecurityLevel,
  queryDb,
  SecurityLevel,
  setSecurityLevel,
} from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await ensureDbInitialized();
  const securityLevel = await getSecurityLevel();
  const currentUser = await getAuthenticatedUser(req);
  const { rows: users } = await queryDb(
    "SELECT id, username, email, role, wallet_balance FROM users ORDER BY id ASC"
  );

  return NextResponse.json({
    securityLevel,
    dbMode: getDbMode(),
    currentUser,
    testUsers: users,
    queryLogs: getQueryLogs().slice(0, 25),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.action === "clear_logs") {
    clearQueryLogs();
    return NextResponse.json({ ok: true, queryLogs: [] });
  }

  const level = String(body.securityLevel || "").toLowerCase() as SecurityLevel;
  if (!["low", "medium", "high", "fixed"].includes(level)) {
    return NextResponse.json(
      { error: "Invalid security level. Use low, medium, high, or fixed." },
      { status: 400 }
    );
  }

  await setSecurityLevel(level);
  return NextResponse.json({
    ok: true,
    securityLevel: level,
    dbMode: getDbMode(),
  });
}
