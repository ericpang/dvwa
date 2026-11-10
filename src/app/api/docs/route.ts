import { NextRequest, NextResponse } from "next/server";
import { resolveEffectiveSecurityLevel } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);

  const openApiSpec = {
    openapi: "3.0.3",
    info: {
      title: "VulnLab / NexusStore REST & XML API",
      version: "1.0.0",
      description:
        "Intentionally vulnerable API surface for penetration testing software validation and OWASP WSTG demonstrations.",
    },
    servers: [{ url: "/" }],
    paths: {
      "/api/auth/login": {
        post: {
          summary: "Authenticate user (Vulnerable to SQLi INJ-01, Enumeration AUTH-01, Brute Force AUTH-02, Session Fixation SESS-02)",
          requestBody: {
            content: {
              "application/json": {
                example: { email: "alice@vulnlab.local", password: "password123" },
              },
            },
          },
        },
      },
      "/api/auth/register": {
        post: {
          summary: "Register new account (Vulnerable to Weak Password Policy AUTH-03)",
        },
      },
      "/api/auth/reset-password": {
        post: {
          summary: "Request or complete password reset (Vulnerable to Predictable Token & Host Header Injection AUTH-04)",
        },
      },
      "/api/products": {
        get: {
          summary: "Search catalog (Vulnerable to UNION & Blind SQL Injection INJ-01, Verbose Errors REC-03)",
          parameters: [{ name: "search", in: "query", schema: { type: "string" } }],
        },
      },
      "/api/products/{id}/reviews": {
        post: {
          summary: "Post product review (Vulnerable to Stored XSS INJ-02)",
        },
      },
      "/api/products/fetch-image": {
        post: {
          summary: "Fetch remote product image by URL (Vulnerable to SSRF INJ-03)",
        },
      },
      "/api/orders/{orderId}": {
        get: {
          summary: "Retrieve order details & PII by ID (Vulnerable to Horizontal IDOR AUTHZ-01)",
        },
      },
      "/api/orders/import-xml": {
        post: {
          summary: "Bulk import order items via XML (Vulnerable to XXE INJ-04)",
        },
      },
      "/api/users/profile": {
        put: {
          summary: "Update user profile (Vulnerable to Mass Assignment Vertical Escalation AUTHZ-02)",
        },
      },
      "/api/wallet/transfer": {
        post: {
          summary: "Transfer wallet funds (Vulnerable to CSRF SESS-03)",
        },
      },
      "/api/coupons/redeem": {
        post: {
          summary: "Redeem promo coupon code (Vulnerable to TOCTOU Race Condition BIZ-02)",
        },
      },
      "/api/checkout": {
        post: {
          summary: "Submit order checkout (Vulnerable to Price & Negative Quantity Manipulation BIZ-01 & Workflow Bypass BIZ-03)",
        },
      },
      "/api/upload": {
        post: {
          summary: "Upload user avatar / receipt file (Vulnerable to Unrestricted File Upload BIZ-04)",
        },
      },
      "/api/admin/users": {
        get: {
          summary: "List all user accounts & password hashes (Vulnerable to Forced Browsing & Method Override AUTHZ-03)",
        },
        delete: {
          summary: "Delete user account",
        },
      },
      "/api/admin/diagnostics": {
        post: {
          summary: "Run network ping diagnostic (Vulnerable to OS Command Injection INJ-05)",
        },
      },
      "/api/invoices/preview": {
        post: {
          summary: "Render custom invoice template (Vulnerable to Server-Side Template Injection INJ-05)",
        },
      },
      "/api/debug/env": {
        get: {
          summary: "Internal environment & secret dump (Vulnerable to Information Disclosure REC-01)",
        },
      },
    },
    "x-leaked-metadata":
      level === "fixed"
        ? undefined
        : {
            stagingJwtSecret: "secret123",
            internalAdminKey: "sk_live_nexusstore_internal_admin_key_99412",
            defaultAdminAccount: "admin@vulnlab.local",
          },
  };

  return NextResponse.json(openApiSpec);
}
