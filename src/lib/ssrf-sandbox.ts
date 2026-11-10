import { SecurityLevel, logSinkEvent } from "./db";

export interface SimulatedSsrfResult {
  status: number;
  url: string;
  headers: Record<string, string>;
  body: string;
  interceptedBySandbox: boolean;
}

const VIRTUAL_FILES: Record<string, string> = {
  "/etc/passwd": `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
postgres:x:109:117:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash
nexusadmin:x:1000:1000:VulnLab Admin,FLAG{XXE_OR_CMDI_PASSWD_READ}:/home/nexusadmin:/bin/bash`,
  "/etc/hosts": `127.0.0.1       localhost
169.254.169.254 instance-data.ec2.internal
10.24.0.15      redis-internal.vulnlab.local
10.24.0.20      postgres-primary.vulnlab.local`,
  "/var/www/.env": `DATABASE_URL="postgresql://neondb_owner:npg_SecretPass9988@ep-nexus-prod.us-east-2.aws.neon.tech/neondb"
JWT_SECRET="secret123"
INTERNAL_FLAG="FLAG{LOCAL_FILE_DISCLOSURE_SUCCESS}"`,
};

export async function simulateOrFetchUrl(
  targetUrl: string,
  level: SecurityLevel
): Promise<SimulatedSsrfResult> {
  const trimmed = targetUrl.trim();

  // Fixed mode: Strict allowlist of trusted image CDNs and block private/link-local ranges
  if (level === "fixed") {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new Error("Invalid URL format");
    }

    const allowedHosts = ["images.unsplash.com", "cdn.vulnlab.local"];
    if (
      parsed.protocol !== "https:" ||
      !allowedHosts.includes(parsed.hostname.toLowerCase())
    ) {
      throw new Error(
        `SSRF Blocked (Fixed Mode): Host '${parsed.hostname}' is not in the trusted HTTPS image allowlist.`
      );
    }
  }

  // Medium mode: Naive filter blocking literal "127.0.0.1" or "localhost", bypassable via 169.254.169.254, 0.0.0.0, [::1], or http://localtest.me
  if (level === "medium") {
    if (
      trimmed.includes("127.0.0.1") ||
      trimmed.toLowerCase().includes("localhost")
    ) {
      throw new Error(
        "SSRF Filter (Medium Mode): Loopback addresses '127.0.0.1' and 'localhost' are blocked."
      );
    }
  }

  logSinkEvent({
    endpoint: "/api/products/fetch-image",
    vulnId: "INJ-03 (SSRF)",
    sql: `-- Server-Side HTTP GET Request -> ${trimmed}`,
    durationMs: 18,
  });

  // Intercept cloud metadata endpoints (AWS / GCP / Azure / Internal) safely inside Vercel
  if (
    trimmed.includes("169.254.169.254") ||
    trimmed.includes("/api/internal/metadata") ||
    trimmed.includes("metadata.google.internal")
  ) {
    if (trimmed.endsWith("/iam/security-credentials/")) {
      return {
        status: 200,
        url: trimmed,
        headers: {
          "content-type": "text/plain",
          server: "EC2ws",
        },
        body: "vulnlab-prod-admin-role\n",
        interceptedBySandbox: true,
      };
    }

    return {
      status: 200,
      url: trimmed,
      headers: {
        "content-type": "application/json",
        server: "EC2ws-Metadata-Emulator",
      },
      body: JSON.stringify(
        {
          Code: "Success",
          LastUpdated: "2026-11-10T06:00:00Z",
          Type: "AWS-HMAC",
          AccessKeyId: "AKIAVULNLABPROD99281",
          SecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYVULNLABKEY",
          Token: "IQoJb3JpZ2luX2VjEJr//////////wEaCXVzLWVhc3QtMiJGMEQCIFLAG{SSRF_CLOUD_METADATA_COMPROMISED}",
          InstanceId: "i-09988776655vulnlab",
          Region: "us-east-1",
          InternalEndpoints: [
            "http://169.254.169.254/latest/meta-data/iam/security-credentials/vulnlab-prod-admin-role",
            "http://127.0.0.1:6379/INFO",
          ],
        },
        null,
        2
      ),
      interceptedBySandbox: true,
    };
  }

  // Intercept simulated internal Redis (127.0.0.1:6379 / 0.0.0.0:6379)
  if (trimmed.includes(":6379")) {
    return {
      status: 200,
      url: trimmed,
      headers: { "content-type": "text/plain" },
      body: `# Server
redis_version:7.2.4
os:Linux 6.1.0-serverless x86_64
# Keyspace
db0:keys=14,expires=2,avg_ttl=350120
master_auth_password:FLAG{SSRF_INTERNAL_REDIS_DISCOVERED}`,
      interceptedBySandbox: true,
    };
  }

  // Intercept file:// protocol in low mode
  if (trimmed.startsWith("file://")) {
    const filePath = trimmed.replace("file://", "");
    const content =
      VIRTUAL_FILES[filePath] ||
      `file:// access granted, but virtual file '${filePath}' not found. Try file:///etc/passwd`;
    return {
      status: 200,
      url: trimmed,
      headers: { "content-type": "text/plain" },
      body: content,
      interceptedBySandbox: true,
    };
  }

  return {
    status: 200,
    url: trimmed,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: "External resource fetched successfully",
      requestedUrl: trimmed,
      contentType: "image/jpeg",
      bytesFetched: 42810,
    }),
    interceptedBySandbox: false,
  };
}

export function parseXmlWithXxeSimulation(
  xmlInput: string,
  level: SecurityLevel
): {
  parsedItems: Array<{ product_id: number; quantity: number; notes: string }>;
  rawExpandedPreview: string;
  xxeTriggered: boolean;
} {
  logSinkEvent({
    endpoint: "/api/orders/import-xml",
    vulnId: "INJ-04 (XXE)",
    sql: `-- XML Parser (resolveExternalEntities=${level !== "fixed"}) -> ${xmlInput.slice(0, 140)}`,
    durationMs: 9,
  });

  if (level === "fixed" && /<!DOCTYPE|<!ENTITY/i.test(xmlInput)) {
    throw new Error(
      "XXE Blocked (Fixed Mode): DOCTYPE and ENTITY declarations are disallowed in XML parser."
    );
  }

  let workingXml = xmlInput;
  let xxeTriggered = false;

  // Parse <!ENTITY name SYSTEM "uri"> declarations
  const entityRegex =
    /<!ENTITY\s+([a-zA-Z0-9_-]+)\s+SYSTEM\s+["']([^"']+)["']\s*>/gi;
  let match: RegExpExecArray | null;

  while ((match = entityRegex.exec(xmlInput)) !== null) {
    const entityName = match[1];
    const systemUri = match[2];
    xxeTriggered = true;

    let replacement = `[Resolved External Entity: ${systemUri}]`;
    const normalizedPath = systemUri.replace(/^file:\/\//i, "");
    if (VIRTUAL_FILES[normalizedPath]) {
      replacement = VIRTUAL_FILES[normalizedPath];
    } else if (systemUri.includes("169.254.169.254")) {
      replacement =
        "AWS_IAM_ROLE=vulnlab-prod-admin-role | SECRET=FLAG{XXE_SSRF_METADATA_LEAK}";
    }

    const refRegex = new RegExp(`&${entityName};`, "g");
    workingXml = workingXml.replace(refRegex, replacement);
  }

  const parsedItems: Array<{
    product_id: number;
    quantity: number;
    notes: string;
  }> = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRegex.exec(workingXml)) !== null) {
    const block = itemMatch[1];
    const pid =
      Number(block.match(/<product_id>([\s\S]*?)<\/product_id>/i)?.[1] || 1) ||
      1;
    const qty =
      Number(block.match(/<quantity>([\s\S]*?)<\/quantity>/i)?.[1] || 1) || 1;
    const notes =
      block.match(/<notes>([\s\S]*?)<\/notes>/i)?.[1]?.trim() ||
      "Imported via XML";
    parsedItems.push({ product_id: pid, quantity: qty, notes });
  }

  if (parsedItems.length === 0) {
    parsedItems.push({
      product_id: 1,
      quantity: 1,
      notes: workingXml.replace(/<[^>]+>/g, " ").trim().slice(0, 500),
    });
  }

  return {
    parsedItems,
    rawExpandedPreview: workingXml,
    xxeTriggered,
  };
}

export function simulateCommandDiagnostics(
  hostInput: string,
  level: SecurityLevel
): { commandExecuted: string; output: string; injected: boolean } {
  const raw = hostInput.trim();

  if (level === "fixed") {
    if (!/^[a-zA-Z0-9.-]+$/.test(raw)) {
      throw new Error(
        "Command Injection Blocked (Fixed Mode): Hostname must contain only alphanumeric characters, dots, and hyphens."
      );
    }
  } else if (level === "medium") {
    if (raw.includes(";") || raw.includes("&&")) {
      throw new Error(
        "Filter Triggered (Medium Mode): Semicolons ';' and '&&' are blocked. (Hint: try pipe '|' or newline/backticks)"
      );
    }
  }

  const commandExecuted = `ping -c 2 ${raw}`;
  logSinkEvent({
    endpoint: "/api/admin/diagnostics",
    vulnId: "INJ-05 (CMDi)",
    sql: `-- OS Shell Execution -> /bin/sh -c "${commandExecuted}"`,
    durationMs: 35,
  });

  const hasSeparator = /[;|&`$()]/.test(raw);
  let baseOutput = `PING ${raw.split(/[;|&`]/)[0].trim() || "127.0.0.1"} (127.0.0.1): 56 data bytes
64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.042 ms
64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.039 ms
--- ping statistics ---
2 packets transmitted, 2 packets received, 0.0% packet loss\n`;

  if (hasSeparator && level !== "fixed") {
    const lower = raw.toLowerCase();
    const extraLines: string[] = [];
    if (lower.includes("whoami")) {
      extraLines.push("nexusadmin");
    }
    if (lower.includes("id")) {
      extraLines.push(
        "uid=1000(nexusadmin) gid=1000(nexusadmin) groups=1000(nexusadmin),27(sudo),999(docker)"
      );
    }
    if (lower.includes("uname")) {
      extraLines.push(
        "Linux vulnlab-serverless-node 6.1.0-28-cloud-amd64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux"
      );
    }
    if (lower.includes("/etc/passwd")) {
      extraLines.push(VIRTUAL_FILES["/etc/passwd"]);
    }
    if (lower.includes("env") || lower.includes("printenv")) {
      extraLines.push(VIRTUAL_FILES["/var/www/.env"]);
    }
    if (lower.includes("ls")) {
      extraLines.push(
        "Dockerfile\nREADME.md\n.env.backup\nnext.config.mjs\npackage.json\nsrc"
      );
    }
    if (extraLines.length === 0) {
      extraLines.push(
        `[Shell Executed Subcommand]: FLAG{OS_COMMAND_INJECTION_VERIFIED}`
      );
    }
    baseOutput += `\n${extraLines.join("\n")}`;
  }

  return {
    commandExecuted,
    output: baseOutput,
    injected: hasSeparator && level !== "fixed",
  };
}

export function renderTemplateWithSstiSimulation(
  templateStr: string,
  context: Record<string, string | number>,
  level: SecurityLevel
): { rendered: string; sstiTriggered: boolean } {
  logSinkEvent({
    endpoint: "/api/invoices/preview",
    vulnId: "INJ-05 (SSTI)",
    sql: `-- Server Template Engine Render -> ${templateStr.slice(0, 120)}`,
    durationMs: 6,
  });

  if (level === "fixed") {
    // Safe variable replacement only for known placeholders
    const safeRendered = templateStr.replace(
      /\{\{\s*(customer_name|order_id|total)\s*\}\}/g,
      (_, key) => String(context[key] ?? "")
    );
    return { rendered: safeRendered, sstiTriggered: false };
  }

  let sstiTriggered = false;
  const evaluateExpr = (expr: string): string => {
    const clean = expr.trim();
    if (clean in context) {
      return String(context[clean]);
    }
    sstiTriggered = true;
    // Safe arithmetic & common SSTI probe evaluation ({{7*7}}, ${7*7}, {{config}}, etc.)
    if (/^[0-9+\-*/().\s]+$/.test(clean)) {
      try {
        const num = Function(`"use strict"; return (${clean});`)();
        return String(num);
      } catch {
        return clean;
      }
    }
    if (
      clean.toLowerCase().includes("process.env") ||
      clean.toLowerCase().includes("config") ||
      clean.toLowerCase().includes("secret")
    ) {
      return `{"JWT_SECRET":"secret123","FLAG":"FLAG{SSTI_TEMPLATE_RCE_SIMULATED}"}`;
    }
    return `[SSTI Evaluated: ${clean} -> FLAG{SSTI_TEMPLATE_INJECTION}]`;
  };

  const rendered = templateStr
    .replace(/\{\{([\s\S]*?)\}\}/g, (_, expr) => evaluateExpr(expr))
    .replace(/\$\{([\s\S]*?)\}/g, (_, expr) => evaluateExpr(expr))
    .replace(/<%=([\s\S]*?)%>/g, (_, expr) => evaluateExpr(expr));

  return { rendered, sstiTriggered };
}
