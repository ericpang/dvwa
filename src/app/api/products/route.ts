import { NextRequest, NextResponse } from "next/server";
import { resolveEffectiveSecurityLevel } from "@/lib/auth";
import { queryDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const level = await resolveEffectiveSecurityLevel(req);
  const search = req.nextUrl.searchParams.get("search") || "";

  let rawSql = "";
  try {
    if (!search) {
      rawSql = `SELECT id, name, category, description, price, stock, image_url, is_hidden FROM products WHERE is_hidden = FALSE ORDER BY id ASC`;
      const { rows } = await queryDb(rawSql, undefined, {
        endpoint: "/api/products",
      });
      return NextResponse.json({
        products: rows,
        executedSql: rawSql,
        securityLevel: level,
      });
    }

    if (level === "low") {
      // INJ-01: Raw unparameterized SQL query vulnerable to UNION SELECT, boolean bypass (' OR is_hidden=TRUE--), and pg_sleep()
      rawSql = `SELECT id, name, category, description, price, stock, image_url, is_hidden FROM products WHERE is_hidden = FALSE AND (name ILIKE '%${search}%' OR description ILIKE '%${search}%')`;
      const { rows } = await queryDb(rawSql, undefined, {
        endpoint: "/api/products",
        vulnId: "INJ-01",
      });
      return NextResponse.json({
        products: rows,
        searchEcho: search,
        executedSql: rawSql,
        securityLevel: level,
      });
    } else if (level === "medium") {
      // Medium mode: Naive filter stripping case-sensitive "UNION" and "--", bypassable via "union" or "/*"
      const filtered = search.replace(/UNION/g, "").replace(/--/g, "");
      rawSql = `SELECT id, name, category, description, price, stock, image_url, is_hidden FROM products WHERE is_hidden = FALSE AND (name ILIKE '%${filtered}%' OR description ILIKE '%${filtered}%')`;
      const { rows } = await queryDb(rawSql, undefined, {
        endpoint: "/api/products",
        vulnId: "INJ-01 (Medium)",
      });
      return NextResponse.json({
        products: rows,
        searchEcho: filtered,
        executedSql: rawSql,
        securityLevel: level,
      });
    } else {
      // High / Fixed mode: Parameterized SQL query prevents SQL injection
      rawSql = `SELECT id, name, category, description, price, stock, image_url, is_hidden FROM products WHERE is_hidden = FALSE AND (name ILIKE $1 OR description ILIKE $1) ORDER BY id ASC`;
      const { rows } = await queryDb(rawSql, [`%${search}%`], {
        endpoint: "/api/products",
        vulnId: "INJ-01 (Parameterized)",
      });
      return NextResponse.json({
        products: rows,
        searchEcho: search,
        executedSql: rawSql,
        securityLevel: level,
      });
    }
  } catch (err: any) {
    // REC-03: Verbose PostgreSQL error & raw query leakage in Low/Medium
    if (level === "low" || level === "medium") {
      return NextResponse.json(
        {
          error: "PostgreSQL Syntax / Execution Error (REC-03 Verbose Error Leak)",
          pgError: err?.message || String(err),
          executedSql: rawSql,
          hint: "Try payload: ' OR is_hidden = TRUE --  or  ' UNION SELECT id, username, email, password_hash, 99, 1, api_key, FALSE FROM users --",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Unable to process product search query." },
      { status: 500 }
    );
  }
}
