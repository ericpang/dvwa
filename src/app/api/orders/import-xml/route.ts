import { NextRequest, NextResponse } from "next/server";
import { resolveEffectiveSecurityLevel } from "@/lib/auth";
import { parseXmlWithXxeSimulation } from "@/lib/ssrf-sandbox";

export async function POST(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const contentType = req.headers.get("content-type") || "";

  let xmlPayload = "";
  if (contentType.includes("json")) {
    const body = await req.json().catch(() => ({}));
    xmlPayload = String(body.xml || "");
  } else {
    xmlPayload = await req.text();
  }

  if (!xmlPayload.trim()) {
    return NextResponse.json(
      { error: "XML payload is required." },
      { status: 400 }
    );
  }

  try {
    const parsed = parseXmlWithXxeSimulation(xmlPayload, level);
    return NextResponse.json({
      ok: true,
      vulnerability: "INJ-04: XML External Entity (XXE) Injection",
      securityLevel: level,
      xxeTriggered: parsed.xxeTriggered,
      parsedItems: parsed.parsedItems,
      rawExpandedPreview: parsed.rawExpandedPreview,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "XML parsing blocked",
        securityLevel: level,
      },
      { status: 403 }
    );
  }
}
