"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Receipt, ShieldAlert, ArrowRight } from "lucide-react";
import { useLab } from "@/components/LabProvider";

export default function OrderIdorPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId || "1001";
  const { securityLevel, refreshLabState } = useLab();

  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<number>(200);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      setStatus(res.status);
      const json = await res.json();
      setData(json);
      await refreshLabState();
    })();
  }, [orderId, securityLevel, refreshLabState]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 font-mono text-xs text-rose-300">
              AUTHZ-01: Horizontal IDOR Lab
            </span>
            <h1 className="mt-2 text-2xl font-bold text-white">
              Order Receipt & Customer PII Viewer (#{orderId})
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Enumerate sequential order identifiers below to test Horizontal
              Privilege Escalation (IDOR) across Alice (#1001), Bob (#1002), and
              Admin (#1003).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {["1001", "1002", "1003"].map((id) => (
              <Link
                key={id}
                href={`/orders/${id}`}
                className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-2 font-mono text-xs font-semibold transition ${
                  orderId === id
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Receipt className="h-3.5 w-3.5" />
                Order #{id}
                {id === "1002" && " (Bob Victim)"}
                {id === "1003" && " (Admin Vault)"}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        </div>

        {data?.idorNotice && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-950/40 p-3.5 text-xs font-semibold text-rose-200">
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
            {data.idorNotice}
          </div>
        )}

        {status !== 200 ? (
          <div className="mt-5 rounded-xl border border-red-500/40 bg-red-950/30 p-5 font-mono text-xs text-red-200">
            <div className="font-bold text-red-300 mb-1">
              HTTP {status} — Authorization Check Enforced
            </div>
            {data?.error}
          </div>
        ) : data?.order ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs">
              <div className="space-y-1.5">
                <div className="text-slate-400">Customer Name (PII)</div>
                <div className="font-semibold text-white text-sm">
                  {data.order.customer_name} (User ID #{data.order.user_id})
                </div>
                <div className="text-slate-400 mt-2">Email & Phone</div>
                <div className="font-mono text-slate-200">
                  {data.order.customer_email} • {data.order.customer_phone}
                </div>
                <div className="text-slate-400 mt-2">Shipping Address</div>
                <div className="text-slate-200">
                  {data.order.shipping_address}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-slate-400">Payment Method</div>
                <div className="font-mono text-emerald-400">
                  Card ending in {data.order.credit_card_last4}
                </div>
                <div className="text-slate-400 mt-2">Order Total & Status</div>
                <div className="font-mono text-lg font-bold text-white">
                  ${Number(data.order.total_amount).toFixed(2)}{" "}
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                    {data.order.status}
                  </span>
                </div>
                <div className="text-slate-400 mt-2">
                  Confidential Order Notes
                </div>
                <div className="rounded border border-amber-500/30 bg-amber-950/30 p-2 font-mono text-amber-300">
                  {data.order.notes}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Line Items
              </h3>
              <div className="divide-y divide-slate-800 text-xs">
                {(data.items || []).map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-white font-medium">
                      {item.product_name} (x{item.quantity})
                    </span>
                    <span className="font-mono text-emerald-400">
                      ${Number(item.unit_price).toFixed(2)} each
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

