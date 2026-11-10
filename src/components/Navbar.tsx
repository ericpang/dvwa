"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  ShoppingCart,
  Terminal,
  User,
  Lock,
  FileCode2,
  Receipt,
  BookOpen,
  Sun,
  Moon,
  Cpu,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { useLab } from "./LabProvider";

export function Navbar() {
  const pathname = usePathname();
  const {
    securityLevel,
    currentUser,
    cart,
    theme,
    cycleTheme,
    resetDatabase,
    quickSwitchUser,
    isLoading,
  } = useLab();

  const [restoreBanner, setRestoreBanner] = useState(false);

  const handleRestoreClick = async () => {
    await resetDatabase();
    setRestoreBanner(true);
    setTimeout(() => setRestoreBanner(false), 3500);
  };

  const levelBadgeColor: Record<string, string> = {
    low: "bg-red-500/20 text-red-300 border-red-500/40",
    medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    high: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    fixed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  };

  const navItems = [
    { href: "/", label: "Storefront", icon: ShieldAlert },
    { href: "/labs", label: "21 Vuln Labs", icon: BookOpen },
    { href: "/orders/1001", label: "Orders (IDOR)", icon: Receipt },
    {
      href: "/checkout",
      label: `Checkout (${cart.length})`,
      icon: ShoppingCart,
    },
    { href: "/profile", label: "Profile & Wallet", icon: User },
    { href: "/admin", label: "Admin Console", icon: Terminal },
  ];

  const themeMeta = {
    dark: { label: "Dark Theme", icon: Moon },
    light: { label: "Light Theme", icon: Sun },
    matrix: { label: "Matrix Theme", icon: Cpu },
  }[theme];
  const ThemeIcon = themeMeta.icon;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      {/* Top Warning & Quick Persona Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/90 px-4 py-1.5 text-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 font-semibold text-red-300 border border-red-500/30">
              OWASP WSTG TARGET
            </span>
            <span className="hidden sm:inline text-slate-400">
              Intentionally Vulnerable Web Application Sandbox
            </span>
            <span
              className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${levelBadgeColor[securityLevel]}`}
            >
              Security: {securityLevel}
            </span>
          </div>

          {/* 1-Click Persona Switcher, Theme Switcher & Restore Button */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 mr-1">Quick Session:</span>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => quickSwitchUser(null)}
              className={`rounded px-2 py-0.5 transition cursor-pointer ${
                !currentUser
                  ? "bg-slate-700 text-white font-medium"
                  : "bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              Unauthenticated
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => quickSwitchUser(1)}
              className={`rounded px-2 py-0.5 transition cursor-pointer ${
                currentUser?.id === 1
                  ? "bg-indigo-600 text-white font-medium"
                  : "bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              Alice (User #1)
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => quickSwitchUser(2)}
              className={`rounded px-2 py-0.5 transition cursor-pointer ${
                currentUser?.id === 2
                  ? "bg-indigo-600 text-white font-medium"
                  : "bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              Bob (Victim #2)
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => quickSwitchUser(3)}
              className={`rounded px-2 py-0.5 transition cursor-pointer ${
                currentUser?.id === 3
                  ? "bg-rose-600 text-white font-medium"
                  : "bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              Admin (#3)
            </button>
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="ml-1 inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-slate-300 hover:bg-slate-700"
            >
              <FileCode2 className="h-3 w-3" />
              OpenAPI
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-indigo-600 text-white shadow-md">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">
              NexusStore
            </span>
            <span className="ml-1.5 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-rose-400">
              VulnLab v1.0
            </span>
          </div>
        </Link>

        <nav
          aria-label="Main Navigation"
          className="flex flex-wrap items-center gap-1"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Controls: Theme Switcher, Restore Original Button & Account */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Color Theme Change Button */}
          <button
            type="button"
            onClick={cycleTheme}
            title="Cycle Color Theme (Dark / Light / Matrix Hacker)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-indigo-500 hover:bg-slate-800 transition cursor-pointer"
          >
            <ThemeIcon className="h-3.5 w-3.5 text-indigo-400" />
            <span>{themeMeta.label}</span>
          </button>

          {/* Restore All Parameters & Database Values to Original Button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleRestoreClick}
            title="Reset all tampered parameters, sessions, cart items, and database tables back to factory original state"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Restore Original
          </button>

          {currentUser ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-600"
            >
              <span className="font-semibold text-white">
                {currentUser.username}
              </span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-indigo-300">
                {currentUser.role}
              </span>
              <span className="font-mono text-emerald-400">
                ${Number(currentUser.wallet_balance).toFixed(2)}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
            >
              <Lock className="h-3.5 w-3.5" />
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Confirmation Toast Banner when Restore Original is triggered */}
      {restoreBanner && (
        <div className="border-t border-emerald-500/40 bg-emerald-950/90 px-4 py-2 text-xs text-emerald-200">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Factory Restore Complete:</strong> All database tables
                (users, passwords, wallet balances, orders, reviews, coupons,
                uploads), session cookies, security level (LOW), and form
                parameters have been restored to original values.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRestoreBanner(false)}
              className="text-emerald-400 hover:underline cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
