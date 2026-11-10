"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  Code2,
  ShieldCheck,
} from "lucide-react";
import { VULNERABILITY_CATALOG, VulnerabilityModule } from "@/lib/vulnerabilities";

export default function VulnerabilityLabsPage() {
  const [selectedPhase, setSelectedPhase] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>("INJ-01");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const phases = [
    "ALL",
    "1. Reconnaissance",
    "2. Authentication",
    "3. Authorization",
    "4. Input Validation & Injection",
    "5. Session Management & CSRF",
    "6. Business Logic",
  ];

  const filtered =
    selectedPhase === "ALL"
      ? VULNERABILITY_CATALOG
      : VULNERABILITY_CATALOG.filter((v) => v.phase === selectedPhase);

  const copyPayload = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-300">
              <BookOpen className="h-3.5 w-3.5" />
              OWASP WSTG Complete Assessment Matrix
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">
              21 Interactive Vulnerability Modules & Code Remediations
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Each module includes reproduction steps, ready-to-run{" "}
              <code className="text-slate-200">curl</code> payloads, affected
              endpoints, and side-by-side Vulnerable vs. Fixed code comparisons.
            </p>
          </div>
        </div>

        {/* Phase Filter Pills */}
        <div className="mt-5 flex flex-wrap gap-1.5">
          {phases.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPhase(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                selectedPhase === p
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-3">
        {filtered.map((vuln: VulnerabilityModule) => {
          const isOpen = expandedId === vuln.id;
          return (
            <div
              key={vuln.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden"
            >
              <div
                onClick={() => setExpandedId(isOpen ? null : vuln.id)}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-800/40 cursor-pointer"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1 font-mono text-xs font-bold text-indigo-300">
                    {vuln.id}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
                      vuln.severity === "Critical"
                        ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : vuln.severity === "High"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    }`}
                  >
                    {vuln.severity} (CVSS {vuln.cvss})
                  </span>
                  <h2 className="text-sm font-bold text-white">{vuln.title}</h2>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono text-slate-400">
                    {vuln.wstgId} • {vuln.cwe}
                  </span>
                  <Link
                    href={vuln.uiPath}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600/20 border border-indigo-500/40 px-2.5 py-1 font-semibold text-indigo-300 hover:bg-indigo-600/30"
                  >
                    Open Target Page
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-800 bg-slate-950/80 p-5 space-y-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-slate-300">{vuln.summary}</div>
                    <span className="rounded bg-slate-900 border border-slate-800 px-2.5 py-1 font-mono text-amber-300">
                      Endpoint: {vuln.endpoint}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-200 mb-1.5">
                      How to Exploit / Reproduce:
                    </h3>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300">
                      {vuln.howToExploit.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Sample curl / Scanner Command */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 font-mono">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>Sample PoC / Scanner Command</span>
                      <button
                        type="button"
                        onClick={() => copyPayload(vuln.id, vuln.samplePayload)}
                        className="inline-flex items-center gap-1 text-indigo-300 hover:text-white cursor-pointer"
                      >
                        {copiedId === vuln.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy Command
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="overflow-x-auto text-amber-300">
                      {vuln.samplePayload}
                    </pre>
                  </div>

                  {/* Side-by-Side Vulnerable vs Fixed Code */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-rose-500/30 bg-rose-950/15 p-3 font-mono">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-rose-300">
                        <Code2 className="h-3.5 w-3.5" />
                        Vulnerable Implementation (Low Mode)
                      </div>
                      <pre className="overflow-x-auto text-rose-200">
                        {vuln.vulnerableCode}
                      </pre>
                    </div>

                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3 font-mono">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Remediated Reference (Fixed Mode)
                      </div>
                      <pre className="overflow-x-auto text-emerald-200">
                        {vuln.fixedCode}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

