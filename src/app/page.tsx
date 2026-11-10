"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  ShoppingCart,
  Sparkles,
  AlertTriangle,
  Database,
  Code2,
  ArrowRight,
} from "lucide-react";
import { useLab } from "@/components/LabProvider";

interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  is_hidden?: boolean;
}

export default function StorefrontPage() {
  const { addToCart, securityLevel, refreshLabState } = useLab();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchEcho, setSearchEcho] = useState("");
  const [executedSql, setExecutedSql] = useState("");
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const runSearch = async (query: string) => {
    setLoading(true);
    setSqlError(null);
    try {
      const url = query
        ? `/api/products?search=${encodeURIComponent(query)}`
        : "/api/products";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setSqlError(data.pgError || data.error || "Query failed");
        setExecutedSql(data.executedSql || "");
        setProducts([]);
      } else {
        setProducts(data.products || []);
        setSearchEcho(data.searchEcho || "");
        setExecutedSql(data.executedSql || "");
      }
      await refreshLabState();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [securityLevel]);

  const sqliPresets = [
    {
      label: "Reveal Hidden Products (Boolean SQLi)",
      payload: "' OR is_hidden = TRUE --",
    },
    {
      label: "Dump User Passwords & API Keys (UNION SQLi)",
      payload:
        "' UNION SELECT id, username, email, password_hash, 99.99, 1, api_key, TRUE FROM users --",
    },
    {
      label: "Trigger Verbose DB Syntax Error (REC-03)",
      payload: "'",
    },
    {
      label: "Reflected XSS Payload (INJ-02)",
      payload: `<img src=x onerror="alert('Reflected XSS Executed! Cookie: ' + document.cookie)">`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero & Search Banner */}
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 p-6 shadow-xl">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-medium text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Cybersecurity Hardware Storefront & OWASP WSTG Benchmark
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              NexusStore Security Research Catalog
            </h1>
            <p className="text-sm text-slate-300">
              Test automated scanners (Burp Suite, sqlmap, Nuclei, AI Agents) or
              use the one-click payload presets below to exploit{" "}
              <span className="text-rose-400 font-semibold">
                SQL Injection (INJ-01)
              </span>
              ,{" "}
              <span className="text-amber-400 font-semibold">
                Reflected XSS (INJ-02)
              </span>
              , and{" "}
              <span className="text-indigo-400 font-semibold">
                Verbose Error Leakage (REC-03)
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/labs"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500"
            >
              View All 21 Vulnerability Labs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Search Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(searchInput);
          }}
          className="mt-5 flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              aria-label="Search products or inject SQL/XSS payload"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search catalog or inject SQLi / XSS payload..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 cursor-pointer"
          >
            Execute Search
          </button>
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                runSearch("");
              }}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              Reset
            </button>
          )}
        </form>

        {/* 1-Click Exploit Payload Bar */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1">
            1-Click Payloads:
          </span>
          {sqliPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setSearchInput(preset.payload);
                runSearch(preset.payload);
              }}
              className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 text-xs text-slate-300 hover:border-rose-500/50 hover:text-rose-300 cursor-pointer transition"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Executed SQL Preview Box */}
        {executedSql && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/90 p-3 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="inline-flex items-center gap-1.5 text-indigo-300 font-semibold">
                <Database className="h-3.5 w-3.5" />
                Executed Backend SQL Query ({securityLevel.toUpperCase()} mode)
              </span>
              <span>Endpoint: GET /api/products</span>
            </div>
            <div className="break-all text-amber-300">{executedSql}</div>
          </div>
        )}

        {/* Reflected XSS Sink Banner (INJ-02) */}
        {searchEcho && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-2.5 text-xs text-amber-200">
            <span className="font-semibold mr-2">
              Search Results Banner (INJ-02 Reflected XSS Sink):
            </span>
            {securityLevel === "low" || securityLevel === "medium" ? (
              <span
                dangerouslySetInnerHTML={{
                  __html: `Showing results for: ${searchEcho}`,
                }}
              />
            ) : (
              <span>Showing results for: {searchEcho}</span>
            )}
          </div>
        )}

        {/* Verbose SQL Error Display (REC-03) */}
        {sqlError && (
          <div className="mt-3 rounded-xl border border-red-500/50 bg-red-950/40 p-4 text-xs text-red-200">
            <div className="flex items-center gap-2 font-bold text-red-300 mb-1">
              <AlertTriangle className="h-4 w-4" />
              PostgreSQL Exception Leaked (REC-03 / INJ-01):
            </div>
            <pre className="whitespace-pre-wrap font-mono text-red-300">
              {sqlError}
            </pre>
          </div>
        )}
      </section>

      {/* Product Grid */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            Catalog Items ({products.length})
          </h2>
          <span className="text-xs text-slate-400">
            Click any product to test Stored XSS in customer reviews
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={`${product.id}-${product.name}`}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                  product.is_hidden
                    ? "border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-950/30"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                      {product.category}
                    </span>
                    {product.is_hidden && (
                      <span className="rounded-md bg-rose-600 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                        SQLi / UNION LEAKED ROW
                      </span>
                    )}
                  </div>

                  <Link href={`/products/${product.id}`}>
                    <h3 className="text-base font-bold text-white hover:text-indigo-400 transition">
                      {product.name}
                    </h3>
                  </Link>

                  <p className="mt-2 text-xs text-slate-300 leading-relaxed break-all">
                    {product.description}
                  </p>

                  {/* If image_url contains a leaked API key from UNION SELECT, surface it clearly */}
                  {product.image_url &&
                    !product.image_url.startsWith("http") && (
                      <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/30 p-2 font-mono text-xs text-amber-300 break-all">
                        <Code2 className="inline h-3.5 w-3.5 mr-1" />
                        Leaked Column (image_url): {product.image_url}
                      </div>
                    )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-4">
                  <div>
                    <span className="text-lg font-bold text-emerald-400 font-mono">
                      ${Number(product.price).toFixed(2)}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      Stock: {product.stock}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/products/${product.id}`}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                    >
                      Reviews (XSS)
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        addToCart({
                          product_id: product.id,
                          name: product.name,
                          price: Number(product.price),
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

