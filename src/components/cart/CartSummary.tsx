"use client";

import Link from "next/link";
import { STOREFRONT_DEMO } from "@/lib/indicative-pricing";
import { ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatCents } from "@/lib/cart-core";

export const ESTIMATE_LABEL = "Estimated total — final amount confirmed at checkout";

export function CartSummary({ onNavigate, size = "md" }: { onNavigate?: () => void; size?: "md" | "lg" }) {
  const { estimatedSubtotalCents, itemCount, hasUnavailable } = useCart();
  const blocked = hasUnavailable;
  return (
    <div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-3 text-ink-soft">
          <span>
            Items ({itemCount})
          </span>
          <span className="font-bold text-ink">{formatCents(estimatedSubtotalCents)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-forest/10 pt-2 font-black text-forest">
          <span className="text-sm leading-snug">{ESTIMATE_LABEL}</span>
          <span className={size === "lg" ? "font-display text-2xl" : "text-base"}>{formatCents(estimatedSubtotalCents)}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-ink-soft">
          {STOREFRONT_DEMO ? "Indicative AUD prices. Availability, final prices and delivery are confirmed by Fresh Stop. No online payment is taken." : "Estimated from the prices shown. Delivery fees, minimum order and GST are calculated and confirmed at checkout."}
        </p>
      </div>
      <Link
        href="/checkout"
        onClick={(e) => {
          if (blocked) e.preventDefault();
          else onNavigate?.();
        }}
        aria-disabled={blocked}
        className={`button mt-4 min-h-12 w-full justify-center text-center ${blocked ? "cursor-not-allowed bg-neutral-300 text-neutral-600" : "button-red"}`}
      >
        {STOREFRONT_DEMO ? "Review order preview" : "Proceed to Checkout"} <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </div>
  );
}
