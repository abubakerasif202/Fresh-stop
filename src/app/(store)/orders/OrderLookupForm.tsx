"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function OrderLookupForm() {
  const router = useRouter();
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: values.get("orderId"), email: values.get("email") })
      });
      const data = await response.json();
      if (!response.ok || typeof data.token !== "string" || typeof data.orderId !== "string") {
        throw new Error(typeof data.error === "string" ? data.error : "Unable to find that order. Check your details and try again.");
      }
      router.push(`/order-confirmation/${encodeURIComponent(data.orderId)}?t=${encodeURIComponent(data.token)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again shortly.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5 rounded-3xl border border-forest/10 bg-white p-6 shadow-soft">
      <div>
        <label className="text-sm font-bold" htmlFor="order-reference">Order reference</label>
        <input id="order-reference" name="orderId" required maxLength={120} placeholder="FS-123456" autoCapitalize="characters" spellCheck={false} className="mt-2 min-h-12 w-full rounded-xl border border-forest/25 px-4" />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="order-email">Email address</label>
        <input id="order-email" name="email" type="email" autoComplete="email" required maxLength={254} className="mt-2 min-h-12 w-full rounded-xl border border-forest/25 px-4" />
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-800">{error}</p>}
      <button disabled={loading} className="min-h-12 w-full rounded-full bg-forest px-5 font-bold text-white disabled:opacity-60">{loading ? "Finding your order…" : "View order"}</button>
    </form>
  );
}
