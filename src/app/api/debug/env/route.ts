import { NextRequest, NextResponse } from "next/server";
import { resolveEffectiveSecurityLevel } from "@/lib/auth";
import { getDbMode, logSinkEvent } from "@/lib/db";

export async function GET(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);

  if (level === "fixed") {
    return NextResponse.json(
      { error: "Not Found (Debug endpoint disabled in Fixed mode)" },
      { status: 404 }
    );
  }

  logSinkEvent({
    endpoint: "/api/debug/env",
    vulnId: "REC-01",
    sql: "-- Information Disclosure: Unauthenticated debug environment dump --",
    durationMs: 2,
  });

  return NextResponse.json({
    vulnerability: "REC-01: Exposed Debug & Environment Endpoint",
    securityLevel: level,
    databaseMode: getDbMode(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || "development",
      JWT_SECRET: process.env.JWT_SECRET || "secret123",
      INTERNAL_ADMIN_API_KEY:
        "sk_live_nexusstore_internal_admin_key_99412_FLAG{DEBUG_ENV_EXPOSED}",
      AWS_METADATA_URL: "http://169.254.169.254/latest/meta-data/",
      INTERNAL_REDIS_URI: "redis://127.0.0.1:6379/0",
      DATABASE_CONFIG:
        getDbMode() === "neon-postgres"
          ? "Neon Serverless PostgreSQL (Connected via DATABASE_URL)"
          : "In-Memory PostgreSQL Sandbox (pg-mem fallback)",
    },
  });
}
