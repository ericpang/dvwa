import { NextResponse } from "next/server";
import { getDbMode, getSecurityLevel, resetAndSeedDatabase } from "@/lib/db";

export async function POST() {
  await resetAndSeedDatabase();
  const securityLevel = await getSecurityLevel();
  const res = NextResponse.json({
    ok: true,
    message:
      "All database tables, user balances, orders, reviews, coupons, sessions, and lab parameters have been restored to factory original values.",
    securityLevel,
    dbMode: getDbMode(),
  });
  // Also clear any active session cookie so auth state returns to clean original state
  res.cookies.delete("vulnlab_sid");
  return res;
}
