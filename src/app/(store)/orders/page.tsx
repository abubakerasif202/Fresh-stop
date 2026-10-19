"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, PackageCheck, ArrowRight, AlertCircle } from "lucide-react";

interface OrderSummary {
  id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentType: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  preferredDeliveryDate?: string | null;
  storeBranch?: { name: string; suburb: string } | null;
}

export default function OrderLookupPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderSummary | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Order not found.");
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
          Enter your order reference number and email address to check current packing and delivery status.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-forest/10 bg-white p-6 sm:p-8 shadow-soft">
        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink mb-1">Order Number (e.g. FS-261019-1234) *</label>
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="FS-XXXXXX-XXXX"
              className="w-full rounded-xl border border-forest/20 px-3.5 py-2.5 text-sm uppercase focus-visible:outline-3 focus-visible:outline-citrus font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com.au"
              className="w-full rounded-xl border border-forest/20 px-3.5 py-2.5 text-sm focus-visible:outline-3 focus-visible:outline-citrus"
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
                {result.orderStatus}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-ink-soft block">Payment Status</span>
                <span className="font-bold text-forest">{result.paymentStatus}</span>
              </div>
              <div>
                <span className="text-ink-soft block">Fulfillment</span>
                <span className="font-bold text-forest">
                  {result.fulfillmentType === "DELIVERY" ? "Sydney Delivery" : "Store Pickup"}
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
                <span className="font-display font-black text-forest">${result.total.toFixed(2)} AUD</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Link
                href={`/order-confirmation/${result.id}`}
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
