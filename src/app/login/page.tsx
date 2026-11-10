"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, UserPlus, KeyRound, Zap } from "lucide-react";
import { useLab } from "@/components/LabProvider";

export default function LoginPage() {
  const router = useRouter();
  const { refreshLabState } = useLab();
  const [tab, setTab] = useState<"login" | "register" | "reset">("login");

  // Login state
  const [email, setEmail] = useState("alice@vulnlab.local");
  const [password, setPassword] = useState("password123");
  const [fixedSessionToken, setFixedSessionToken] = useState("");

  // Register state
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("1");

  // Reset state
  const [resetEmail, setResetEmail] = useState("bob@vulnlab.local");
  const [customHostHeader, setCustomHostHeader] = useState(
    "evil-collaborator.pentest.local"
  );
  const [resetTokenInput, setResetTokenInput] = useState("");
  const [newResetPassword, setNewResetPassword] = useState("hacked123");

  const [resultJson, setResultJson] = useState<any>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = fixedSessionToken
      ? `/api/auth/login?vulnlab_sid=${encodeURIComponent(fixedSessionToken)}`
      : "/api/auth/login";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fixedSessionToken }),
    });
    const data = await res.json();
    setStatusCode(res.status);
    setResultJson(data);
    await refreshLabState();
    if (res.ok) {
      setTimeout(() => router.push("/profile"), 800);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: regUsername,
        email: regEmail,
        password: regPassword,
      }),
    });
    const data = await res.json();
    setStatusCode(res.status);
    setResultJson(data);
    await refreshLabState();
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-Host": customHostHeader,
      },
      body: JSON.stringify({ email: resetEmail }),
    });
    const data = await res.json();
    setStatusCode(res.status);
    setResultJson(data);
    if (data?.debugResetPreview?.predictableToken) {
      setResetTokenInput(data.debugResetPreview.predictableToken);
    }
    await refreshLabState();
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetTokenInput,
        newPassword: newResetPassword,
      }),
    });
    const data = await res.json();
    setStatusCode(res.status);
    setResultJson(data);
    await refreshLabState();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h1 className="text-2xl font-bold text-white">
          Authentication & Session Testing Lab
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Targets OWASP WSTG Authentication & Session modules:{" "}
          <span className="text-rose-400 font-mono">
            INJ-01 (SQLi Auth Bypass)
          </span>
          ,{" "}
          <span className="text-amber-400 font-mono">
            AUTH-01..04 (Enumeration, Brute Force, Weak Passwords, Reset Poisoning)
          </span>
          , and{" "}
          <span className="text-indigo-400 font-mono">
            SESS-01..02 (Predictable Tokens & Session Fixation)
          </span>
          .
        </p>

        {/* Mode Tabs */}
        <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer ${
              tab === "login"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Lock className="h-4 w-4" />
            Sign In (SQLi & Session Fixation)
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer ${
              tab === "register"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Register (Weak Password Policy)
          </button>
          <button
            type="button"
            onClick={() => setTab("reset")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer ${
              tab === "reset"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <KeyRound className="h-4 w-4" />
            Password Reset (Token & Host Poisoning)
          </button>
        </div>

        {/* Tab 1: Login */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@vulnlab.local' OR '1'='1");
                  setPassword("anything");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" />
                Fill SQLi Admin Bypass Payload (INJ-01)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("nonexistent_user@vulnlab.local");
                  setPassword("test");
                }}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 cursor-pointer"
              >
                Test Invalid User 404 (AUTH-01)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("bob@vulnlab.local");
                  setPassword("wrong_password");
                }}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 cursor-pointer"
              >
                Test Valid User Wrong Pass 401 (AUTH-01)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFixedSessionToken("attacker_fixed_session_9999");
                }}
                className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 cursor-pointer"
              >
                Inject Session Fixation Token (SESS-02)
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email / Username (SQLi Sink in Low Mode)
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Optional Pre-Set Session ID (?vulnlab_sid= for Session Fixation
                SESS-02)
              </label>
              <input
                type="text"
                value={fixedSessionToken}
                onChange={(e) => setFixedSessionToken(e.target.value)}
                placeholder="Leave blank for normal sequential token or enter attacker_fixed_sid"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white font-mono"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 cursor-pointer"
            >
              Submit Login Request
            </button>
          </form>
        )}

        {/* Tab 2: Register */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="pentester"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="pentester@vulnlab.local"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password (Try &apos;1&apos; for AUTH-03)
                </label>
                <input
                  type="text"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 cursor-pointer"
            >
              Register Account
            </button>
          </form>
        )}

        {/* Tab 3: Password Reset */}
        {tab === "reset" && (
          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
            <form
              onSubmit={handleRequestReset}
              className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <h3 className="text-sm font-bold text-white">
                Step 1: Request Reset Link (Host Header Poisoning)
              </h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Target Victim Email
                </label>
                <input
                  type="text"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Injected X-Forwarded-Host Header (AUTH-04)
                </label>
                <input
                  type="text"
                  value={customHostHeader}
                  onChange={(e) => setCustomHostHeader(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-amber-300 font-mono"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 cursor-pointer"
              >
                Generate Reset Token
              </button>
            </form>

            <form
              onSubmit={handleCompleteReset}
              className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <h3 className="text-sm font-bold text-white">
                Step 2: Redeem Predictable Token (reset_1002 = Bob)
              </h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Reset Token (Predictable format: reset_1001, reset_1002,
                  reset_1003)
                </label>
                <input
                  type="text"
                  value={resetTokenInput}
                  onChange={(e) => setResetTokenInput(e.target.value)}
                  placeholder="reset_1002"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  New Password for Victim
                </label>
                <input
                  type="text"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
              >
                Overwrite Victim Password
              </button>
            </form>
          </div>
        )}

        {/* API Response Inspector */}
        {resultJson && (
          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold text-indigo-300">
                HTTP Response Inspector
              </span>
              <span
                className={`rounded px-2 py-0.5 font-bold ${
                  statusCode && statusCode < 300
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/20 text-rose-300"
                }`}
              >
                HTTP {statusCode}
              </span>
            </div>
            <pre className="overflow-x-auto text-slate-200">
              {JSON.stringify(resultJson, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

