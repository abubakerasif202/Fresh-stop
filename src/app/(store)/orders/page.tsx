"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, PackageCheck, ArrowRight, AlertCircle } from "lucide-react";

interface OrderSummary {
  orderNumber: string;
  orderStatus: string;
  paymentState: "PENDING" | "CONFIRMED" | "FAILED" | "EXPIRED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  fulfillmentType: string;
  deliverySuburb: string | null;
  totalCents: number;
  createdAt: string;
  items: Array<{ name: string; unit: string; quantity: number; totalCents: number }>;
}

const PAYMENT_LABELS: Record<OrderSummary["paymentState"], string> = {
  PENDING: "Payment pending",
  CONFIRMED: "Payment confirmed",
  FAILED: "Payment failed",
  EXPIRED: "Payment expired",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded"
};

export default function OrderLookupPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderSummary | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const reference = params.get("order");
    const access = params.get("t");
    if (reference && access) {
      setOrderNumber(reference);
      setToken(access);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, token })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Order not found.");
      } else {
        setResult(data.order);
      }
    } catch {
      setError("Unable to connect to order server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-leaf-soft text-forest">
          <PackageCheck size={32} />
        </div>
        <h1 className="mt-4 font-display text-3xl font-black text-forest sm:text-4xl">
          Track Your Grocery Order
        </h1>
        <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
          Enter your order reference number and the access code from your order confirmation link to check your order status.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-forest/10 bg-white p-6 sm:p-8 shadow-soft">
        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label htmlFor="order-reference" className="block text-xs font-bold text-ink mb-1">Order Number (e.g. FS-261019-1234) *</label>
            <input
              id="order-reference"
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="FS-XXXXXX-XXXX"
              className="w-full rounded-xl border border-forest/20 px-3.5 py-2.5 text-sm uppercase focus-visible:outline-3 focus-visible:outline-citrus font-mono"
            />
          </div>

          <div>
            <label htmlFor="order-access" className="block text-xs font-bold text-ink mb-1">Access Code *</label>
            <input
              id="order-access"
              type="password"
              required
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="From your confirmation link (?t=...)"
              className="w-full rounded-xl border border-forest/20 px-3.5 py-2.5 text-sm font-mono focus-visible:outline-3 focus-visible:outline-citrus"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-brand-red border border-brand-red/20">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="button button-green w-full justify-center py-3.5 text-sm"
          >
            {isSubmitting ? "Searching Orders…" : (
              <span className="inline-flex items-center gap-2">
                <Search size={16} /> Look Up Order
              </span>
            )}
          </button>
        </form>

        {result && (
          <div className="mt-8 border-t border-forest/10 pt-6">
            <div className="flex items-center justify-between border-b border-forest/10 pb-4">
              <div>
                <span className="text-xs font-bold text-ink-soft">Order Reference</span>
                <p className="font-display text-lg font-black text-forest">{result.orderNumber}</p>
              </div>
              <span className="rounded-full bg-leaf-soft px-3 py-1 text-xs font-black text-forest">
                {result.orderStatus.replace(/_/g, " ")}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-ink-soft block">Payment Status</span>
                <span className="font-bold text-forest">{PAYMENT_LABELS[result.paymentState]}</span>
              </div>
              <div>
                <span className="text-ink-soft block">Fulfillment</span>
                <span className="font-bold text-forest">
                  {result.fulfillmentType === "DELIVERY"
                    ? `Sydney Delivery${result.deliverySuburb ? ` (${result.deliverySuburb})` : ""}`
                    : "Store Pickup"}
                </span>
              </div>
              <div>
                <span className="text-ink-soft block">Date Placed</span>
                <span className="font-bold text-forest">
                  {new Date(result.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div>
                <span className="text-ink-soft block">Total</span>
                <span className="font-display font-black text-forest">${(result.totalCents / 100).toFixed(2)} AUD</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Link
                href={`/order-confirmation/${encodeURIComponent(result.orderNumber)}?t=${encodeURIComponent(token)}`}
                className="inline-flex items-center gap-1.5 text-xs font-black text-deep-green hover:underline"
              >
                View Full Order Receipt &amp; Details <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
