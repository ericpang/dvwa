import { NextRequest, NextResponse } from "next/server";
import { resolveEffectiveSecurityLevel } from "@/lib/auth";
import { simulateOrFetchUrl } from "@/lib/ssrf-sandbox";

export async function POST(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const body = await req.json().catch(() => ({}));
  const targetUrl = String(body.url || "");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Parameter 'url' is required" },
      { status: 400 }
    );
  }

  try {
    const result = await simulateOrFetchUrl(targetUrl, level);
    return NextResponse.json({
      ok: true,
      vulnerability: "INJ-03: Server-Side Request Forgery (SSRF)",
      securityLevel: level,
      fetchedResult: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "SSRF request blocked",
        securityLevel: level,
      },
      { status: 403 }
    );
  }
}
