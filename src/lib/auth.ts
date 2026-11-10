import { NextRequest } from "next/server";
import crypto from "crypto";
import {
  getNextSequentialSessionId,
  getSecurityLevel,
   logSinkEvent,
  queryDb,
  SecurityLevel,
} from "./db";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  wallet_balance: number;
  full_name?: string;
  shipping_address?: string;
  phone?: string;
  api_key?: string;
}

const WEAK_JWT_SECRET = process.env.JWT_SECRET || "secret123";
const STRONG_JWT_SECRET =
  "fixed_mode_99f8a7b6c5d4e3f2a100998877665544332211_csprng_secret";

function base64UrlEncode(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): string {
  const pad = 4 - (input.length % 4);
  const normalized =
    input.replace(/-/g, "+").replace(/_/g, "/") +
    (pad < 4 ? "=".repeat(pad) : "");
  return Buffer.from(normalized, "base64").toString("utf8");
}

export function createJwtToken(
  user: { id: number; username: string; email: string; role: string },
  level: SecurityLevel
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (level === "fixed" ? 3600 : 86400 * 30),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const secret = level === "fixed" ? STRONG_JWT_SECRET : WEAK_JWT_SECRET;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwtToken(
  token: string,
  level: SecurityLevel
): { id: number; username: string; email: string; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const headerJson = JSON.parse(base64UrlDecode(parts[0]));
    const payloadJson = JSON.parse(base64UrlDecode(parts[1]));

    // AUTH-05: In low/medium mode, allow alg: "none" unsigned JWT tokens
    if (
      (level === "low" || level === "medium") &&
      String(headerJson.alg).toLowerCase() === "none"
    ) {
      logSinkEvent({
        endpoint: "JWT Verifier",
        vulnId: "AUTH-05",
        sql: `-- JWT alg="none" accepted without signature verification: role=${payloadJson.role}`,
        durationMs: 1,
      });
      return {
        id: Number(payloadJson.sub || 1),
        username: payloadJson.username || "jwt_user",
        email: payloadJson.email || "jwt@vulnlab.local",
        role: payloadJson.role || "customer",
      };
    }

    const secret = level === "fixed" ? STRONG_JWT_SECRET : WEAK_JWT_SECRET;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${parts[0]}.${parts[1]}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (parts[2] !== expectedSig) {
      return null;
    }

    return {
      id: Number(payloadJson.sub),
      username: payloadJson.username,
      email: payloadJson.email,
      role: payloadJson.role,
    };
  } catch {
    return null;
  }
}

export async function issueSession(
  userId: number,
  level: SecurityLevel,
  fixedSessionToken?: string | null
): Promise<string> {
  let token: string;

  // SESS-02: Session fixation allowed in low & medium if caller supplies pre-existing token
  if (
    (level === "low" || level === "medium") &&
    fixedSessionToken &&
    fixedSessionToken.trim().length > 0
  ) {
    token = fixedSessionToken.trim();
  } else if (level === "low") {
    // SESS-01: Predictable sequential session token for Burp Sequencer demo
    token = getNextSequentialSessionId();
  } else if (level === "medium") {
    // Medium: Weak timestamp-based MD5 token
    token = crypto
      .createHash("md5")
      .update(`${userId}:${Math.floor(Date.now() / 1000)}`)
      .digest("hex");
  } else {
    // High / Fixed: High-entropy CSPRNG token
    token = crypto.randomBytes(32).toString("hex");
  }

  await queryDb(
    `INSERT INTO sessions (token, user_id, is_active) VALUES ($1, $2, TRUE)`,
    [token, userId],
    { endpoint: "/api/auth/login", vulnId: "SESS-01" }
  );

  return token;
}

export async function getAuthenticatedUser(
  req: NextRequest
): Promise<AuthUser | null> {
  const level = await getSecurityLevel();

  // 1. Check Authorization: Bearer <jwt>
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const rawToken = authHeader.slice(7).trim();
    const jwtClaims = verifyJwtToken(rawToken, level);
    if (jwtClaims) {
      const { rows } = await queryDb<AuthUser>(
        "SELECT id, username, email, role, wallet_balance, full_name, shipping_address, phone, api_key FROM users WHERE id = $1",
        [jwtClaims.id]
      );
      if (rows[0]) {
        // Allow JWT claim role override to demonstrate vertical privilege escalation via JWT tampering (AUTH-05 / AUTHZ-02)
        return {
          ...rows[0],
          role: jwtClaims.role || rows[0].role,
          wallet_balance: Number(rows[0].wallet_balance),
        };
      }
    }
  }

  // 2. Check vulnlab_sid cookie or query parameter (SESS-02)
  const querySid = req.nextUrl.searchParams.get("vulnlab_sid");
  const cookieSid = req.cookies.get("vulnlab_sid")?.value;
  const sid =
    (level === "low" || level === "medium") && querySid ? querySid : cookieSid;

  if (!sid) return null;

  const sessionQuery =
    level === "low"
      ? // SESS-02: In low mode, ignore is_active flag so logged-out tokens remain reusable
        `SELECT u.id, u.username, u.email, u.role, u.wallet_balance, u.full_name, u.shipping_address, u.phone, u.api_key
         FROM sessions s JOIN users u ON s.user_id = u.id
         WHERE s.token = $1 LIMIT 1`
      : `SELECT u.id, u.username, u.email, u.role, u.wallet_balance, u.full_name, u.shipping_address, u.phone, u.api_key
         FROM sessions s JOIN users u ON s.user_id = u.id
         WHERE s.token = $1 AND s.is_active = TRUE LIMIT 1`;

  const { rows } = await queryDb<AuthUser>(sessionQuery, [sid]);
  if (!rows[0]) return null;

  return {
    ...rows[0],
    wallet_balance: Number(rows[0].wallet_balance),
  };
}

export async function resolveEffectiveSecurityLevel(
  req?: NextRequest
): Promise<SecurityLevel> {
  const headerOverride = req?.headers
    .get("x-security-level")
    ?.toLowerCase() as SecurityLevel | undefined;
  if (
    headerOverride &&
    ["low", "medium", "high", "fixed"].includes(headerOverride)
  ) {
    return headerOverride;
  }
  return getSecurityLevel();
}
