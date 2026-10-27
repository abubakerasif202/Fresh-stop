"use client";

import { useSyncExternalStore } from "react";
import { isCheckoutCancelled } from "@/lib/checkout-cancelled";

const subscribe = () => () => undefined;
const readFlag = () => isCheckoutCancelled(window.location.search);
const readServerFlag = () => false;

/** Shown when the customer returns from Stripe without paying. Nothing has been charged. */
export function CancelledNotice() {
  const cancelled = useSyncExternalStore(subscribe, readFlag, readServerFlag);
  if (!cancelled) return null;
  return (
    <div role="status" className="mb-6 rounded-xl border border-amber-300 bg-sun/25 p-4 text-sm text-amber-900">
      <p className="font-black">Payment cancelled</p>
      <p className="mt-1 text-xs font-bold">You were not charged. Your items are still in your cart, so you can review your order and continue to payment when you are ready.</p>
    </div>
  );
}
