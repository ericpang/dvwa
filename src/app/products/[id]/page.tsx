"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MessageSquareWarning, ShoppingCart, Zap } from "lucide-react";
import { useLab } from "@/components/LabProvider";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = Number(params.id || 1);
  const { addToCart, securityLevel, refreshLabState } = useLab();

  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [authorName, setAuthorName] = useState("Alice Mercer");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadProduct = async () => {
    const res = await fetch(`/api/products/${productId}`);
    if (res.ok) {
      const data = await res.json();
      setProduct(data.product);
      setReviews(data.reviews || []);
    }
  };

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, securityLevel]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author_name: authorName, rating, comment }),
    });
    if (res.ok) {
      setComment("");
      setStatusMsg(
        "Review stored! If you injected an XSS payload in Low/Medium mode, it will execute below and inside /admin."
      );
      await loadProduct();
      await refreshLabState();
    }
  };

  if (!product) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
        Loading product #{productId}...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div className="space-y-2">
            <span className="rounded bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
              {product.category}
            </span>
            <h1 className="text-2xl font-bold text-white">{product.name}</h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              {product.description}
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end justify-between">
            <div className="font-mono text-2xl font-bold text-emerald-400">
              ${Number(product.price).toFixed(2)}
            </div>
            <button
              type="button"
              onClick={() =>
                addToCart({
                  product_id: product.id,
                  name: product.name,
                  price: Number(product.price),
                })
              }
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      {/* Stored XSS Review Submission Lab */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleSubmitReview}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
        >
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <MessageSquareWarning className="h-5 w-5" />
            <h2>Post Product Review (INJ-02 Stored XSS Sink)</h2>
          </div>
          <p className="text-xs text-slate-400">
            In <span className="text-rose-400 font-mono">LOW</span> and{" "}
            <span className="text-amber-400 font-mono">MEDIUM</span> modes,
            reviews are stored and rendered via{" "}
            <code className="text-slate-200">dangerouslySetInnerHTML</code> both
            here and in the Administrator Review Console (
            <code className="text-slate-200">/admin</code>).
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setComment(
                  `Awesome device! <img src=x onerror="alert('Stored XSS Executed! Cookie: ' + document.cookie)">`
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              Fill Stored XSS Alert Payload
            </button>
            <button
              type="button"
              onClick={() =>
                setComment(
                  `<div style="padding:8px;background:#7f1d1d;border:1px solid #ef4444;border-radius:6px;color:#fff"><b>[HTML Injection Banner]</b> Fake Session Expired — Please re-enter credentials</div>`
                )
              }
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 hover:bg-amber-500/20 cursor-pointer"
            >
              Fill HTML Defacement Payload
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Author Name
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Rating (1-5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Review Comment (HTML / XSS Sink)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your review or inject <img src=x onerror=alert(1)>..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white font-mono"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-500 cursor-pointer"
          >
            Submit Review
          </button>

          {statusMsg && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-xs text-emerald-300">
              {statusMsg}
            </div>
          )}
        </form>

        {/* Rendered Reviews List */}
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-base font-bold text-white">
            Customer Reviews ({reviews.length})
          </h2>
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="font-semibold text-white">
                    {rev.author_name}
                  </span>
                  <span className="text-amber-400">
                    {"★".repeat(Number(rev.rating || 5))}
                  </span>
                </div>
                {securityLevel === "fixed" || securityLevel === "high" ? (
                  <div className="text-slate-200">{rev.comment}</div>
                ) : (
                  <div
                    className="text-slate-200"
                    dangerouslySetInnerHTML={{ __html: rev.comment }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

