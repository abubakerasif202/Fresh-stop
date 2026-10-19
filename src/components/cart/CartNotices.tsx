"use client";

import { AlertTriangle } from "lucide-react";
import { useCart } from "@/context/CartContext";

/** Banners about the state of the cart versus the server: failed price check and unavailable items. */
export function CartNotices() {
  const { refreshState, hasUnavailable, removeUnavailable } = useCart();
  return (
    <>
      {refreshState === "failed" && (
        <p role="status" className="mb-3 flex items-start gap-2 rounded-xl bg-sun/25 p-3 text-xs font-bold text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          We could not check current prices just now. Prices shown may be out of date; the final price is confirmed at checkout.
        </p>
      )}
      {hasUnavailable && (
        <div role="alert" className="mb-3 rounded-xl border border-brand-red/20 bg-red-50 p-3 text-xs font-bold text-brand-red">
          <p>Some items in your cart can no longer be ordered online.</p>
          <button type="button" onClick={removeUnavailable} className="mt-2 min-h-11 rounded-full bg-brand-red px-4 text-white focus-visible:outline-3 focus-visible:outline-citrus">
            Remove unavailable items
          </button>
        </div>
      )}
    </>
  );
}
