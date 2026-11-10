import { NextRequest, NextResponse } from "next/server";
import { resolveEffectiveSecurityLevel } from "@/lib/auth";
import { simulateCommandDiagnostics } from "@/lib/ssrf-sandbox";

export async function POST(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const body = await req.json().catch(() => ({}));
  const host = String(body.host || "127.0.0.1");

  try {
    const result = simulateCommandDiagnostics(host, level);
    return NextResponse.json({
      ok: true,
      vulnerability: "INJ-05: OS Command Injection",
      securityLevel: level,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Command execution blocked",
        securityLevel: level,
      },
      { status: 400 }
    );
  }
}
