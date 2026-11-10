import { Pool as NeonPool } from "@neondatabase/serverless";
import { newDb, DataType } from "pg-mem";
import { SEED_SQL } from "./seed";

export type SecurityLevel = "low" | "medium" | "high" | "fixed";

export interface QueryLogEntry {
  id: string;
  timestamp: string;
  endpoint?: string;
  vulnId?: string;
  sql: string;
  params?: unknown[];
  durationMs: number;
  rowCount?: number;
  error?: string;
  mode: "neon-postgres" | "in-memory-postgres";
}

interface GlobalDbState {
  pool: any;
  initialized: boolean;
  initializingPromise: Promise<void> | null;
  queryLogs: QueryLogEntry[];
  securityLevel: SecurityLevel;
  sessionCounter: number;
}

const globalForDb = globalThis as unknown as { __vulnLabDb?: GlobalDbState };

if (!globalForDb.__vulnLabDb) {
  globalForDb.__vulnLabDb = {
    pool: null,
    initialized: false,
    initializingPromise: null,
    queryLogs: [],
    securityLevel: "low",
    sessionCounter: 10040,
  };
}

const state = globalForDb.__vulnLabDb;

export function getDbMode(): "neon-postgres" | "in-memory-postgres" {
  return process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0
    ? "neon-postgres"
    : "in-memory-postgres";
}

function createPool() {
  if (state.pool) return state.pool;

  if (getDbMode() === "neon-postgres") {
    state.pool = new NeonPool({
      connectionString: process.env.DATABASE_URL,
    });
  } else {
    const mem = newDb({
      autoCreateForeignKeyIndices: true,
    });

    // Register standard PostgreSQL helper functions used in SQLi / diagnostics
    mem.public.registerFunction({
      name: "version",
      returns: DataType.text,
      implementation: () =>
        "PostgreSQL 16.4 (Neon Serverless / VulnLab Sandbox) on x86_64-pc-linux-gnu",
    });

    mem.public.registerFunction({
      name: "current_database",
      returns: DataType.text,
      implementation: () => "neondb_vulnlab",
    });

    mem.public.registerFunction({
      name: "current_user",
      returns: DataType.text,
      implementation: () => "neondb_owner",
    });

    mem.public.registerFunction({
      name: "pg_sleep",
      args: [DataType.float],
      returns: DataType.text,
      implementation: (seconds: number) => {
        return `slept_${seconds}s`;
      },
    });

    const { Pool } = mem.adapters.createPg();
    state.pool = new Pool();
  }

  return state.pool;
}

export async function ensureDbInitialized(): Promise<void> {
  if (state.initialized) return;
  if (state.initializingPromise) {
    await state.initializingPromise;
    return;
  }

  state.initializingPromise = (async () => {
    const pool = createPool();
    try {
      const check = await pool.query(
        "SELECT value FROM lab_settings WHERE key = 'security_level'"
      );
      if (check.rows?.length > 0) {
        state.securityLevel = check.rows[0].value as SecurityLevel;
        state.initialized = true;
        return;
      }
    } catch {
      // Table does not exist yet; proceed with seed
    }

    for (const statement of SEED_SQL) {
      const trimmed = statement.trim();
      if (trimmed) {
        await pool.query(trimmed);
      }
    }
    state.initialized = true;
  })();

  try {
    await state.initializingPromise;
  } finally {
    state.initializingPromise = null;
  }
}

export async function resetAndSeedDatabase(): Promise<void> {
  if (getDbMode() === "in-memory-postgres") {
    state.pool = null;
  }
  const pool = createPool();
  for (const statement of SEED_SQL) {
    const trimmed = statement.trim();
    if (trimmed) {
      await pool.query(trimmed);
    }
  }
  state.initialized = true;
  state.securityLevel = "low";
  state.sessionCounter = 10040;
  state.queryLogs = [];
  logSinkEvent({
    endpoint: "/api/lab/reset",
    vulnId: "FACTORY-RESTORE",
    sql: "-- Full Factory Restore: All tables, parameters, sessions & settings reset to original values --",
    durationMs: 10,
    rowCount: SEED_SQL.length,
  });
}

export function logSinkEvent(entry: {
  endpoint?: string;
  vulnId?: string;
  sql: string;
  params?: unknown[];
  durationMs: number;
  rowCount?: number;
  error?: string;
}) {
  const item: QueryLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    mode: getDbMode(),
    ...entry,
  };
  state.queryLogs.unshift(item);
  if (state.queryLogs.length > 40) {
    state.queryLogs.length = 40;
  }
}

export function getQueryLogs(): QueryLogEntry[] {
  return state.queryLogs;
}

export function clearQueryLogs(): void {
  state.queryLogs = [];
}

export function getNextSequentialSessionId(): string {
  state.sessionCounter += 1;
  return `00000000000${state.sessionCounter}`.slice(-12);
}

export async function queryDb<T = any>(
  sqlText: string,
  params?: unknown[],
  meta?: { endpoint?: string; vulnId?: string }
): Promise<{ rows: T[]; rowCount: number }> {
  await ensureDbInitialized();
  const pool = createPool();
  const start = Date.now();

  // Detect simulated pg_sleep(N) for time-based blind SQLi in in-memory mode
  const sleepMatch = sqlText.match(/pg_sleep\(\s*(\d+(?:\.\d+)?)\s*\)/i);
  if (sleepMatch && getDbMode() === "in-memory-postgres") {
    const sec = Math.min(parseFloat(sleepMatch[1]) || 0, 10);
    if (sec > 0) {
      await new Promise((r) => setTimeout(r, sec * 1000));
    }
  }

  try {
    const res =
      params && params.length > 0
        ? await pool.query(sqlText, params)
        : await pool.query(sqlText);
    const durationMs = Date.now() - start;
    const rows = Array.isArray(res)
      ? res[res.length - 1]?.rows ?? []
      : res.rows ?? [];
    const rowCount = Array.isArray(res)
      ? res[res.length - 1]?.rowCount ?? rows.length
      : res.rowCount ?? rows.length;

    logSinkEvent({
      endpoint: meta?.endpoint,
      vulnId: meta?.vulnId,
      sql: sqlText,
      params,
      durationMs,
      rowCount,
    });

    return { rows, rowCount };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    logSinkEvent({
      endpoint: meta?.endpoint,
      vulnId: meta?.vulnId,
      sql: sqlText,
      params,
      durationMs,
      error: err?.message || String(err),
    });
    throw err;
  }
}

export async function getSecurityLevel(): Promise<SecurityLevel> {
  await ensureDbInitialized();
  try {
    const pool = createPool();
    const res = await pool.query(
      "SELECT value FROM lab_settings WHERE key = 'security_level'"
    );
    if (res.rows?.length > 0) {
      const val = res.rows[0].value as SecurityLevel;
      if (["low", "medium", "high", "fixed"].includes(val)) {
        state.securityLevel = val;
        return val;
      }
    }
  } catch {
    // Fallback to cached state
  }
  return state.securityLevel;
}

export async function setSecurityLevel(level: SecurityLevel): Promise<void> {
  await ensureDbInitialized();
  state.securityLevel = level;
  const pool = createPool();
  await pool.query(
    "UPDATE lab_settings SET value = $1 WHERE key = 'security_level'",
    [level]
  );
}
