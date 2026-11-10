import { NextRequest, NextResponse } from "next/server";
import { resolveEffectiveSecurityLevel } from "@/lib/auth";
import { queryDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const sid = req.cookies.get("vulnlab_sid")?.value;

  // SESS-02: In Low mode, logout only clears the browser cookie without invalidating the token in the database
  if (sid && level !== "low") {
    await queryDb("UPDATE sessions SET is_active = FALSE WHERE token = $1", [
      sid,
    ]);
  }

  const res = NextResponse.json({
    ok: true,
    serverSessionInvalidated: level !== "low",
    note:
      level === "low"
        ? "SESS-02 Vulnerable: Token was NOT invalidated server-side and can still be replayed!"
        : "Session invalidated server-side.",
  });
  res.cookies.delete("vulnlab_sid");
  return res;
}
