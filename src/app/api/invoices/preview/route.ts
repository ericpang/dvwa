import { NextRequest, NextResponse } from "next/server";
import { resolveEffectiveSecurityLevel } from "@/lib/auth";
import { renderTemplateWithSstiSimulation } from "@/lib/ssrf-sandbox";

export async function POST(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const body = await req.json().catch(() => ({}));
  const template = String(
    body.template ||
      "Invoice for {{customer_name}} (Order #{{order_id}}): Total ${{total}}"
  );

  const result = renderTemplateWithSstiSimulation(
    template,
    {
      customer_name: body.customer_name || "Alice Mercer",
      order_id: body.order_id || 1001,
      total: body.total || "228.99",
    },
    level
  );

  return NextResponse.json({
    ok: true,
    vulnerability: "INJ-05: Server-Side Template Injection (SSTI)",
    securityLevel: level,
    ...result,
  });
}
