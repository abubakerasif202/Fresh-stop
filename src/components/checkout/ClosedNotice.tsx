"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { EnquiryButton } from "@/components/enquiry/EnquiryButton";
import { useCart } from "@/context/CartContext";
import { FALLBACK_IMAGE } from "@/lib/cart-core";

/** Shown instead of a pay button while paid checkout is closed. Reuses the standard enquiry flow. */
export function ClosedNotice() {
  const { items } = useCart();
  const summary = items.slice(0, 6).map((l) => `${l.name} x${l.quantity}`).join(", ");
  const subject = items.length ? `my order (${summary}${items.length > 6 ? ", and more" : ""})` : "an order";
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:py-20" role="region" aria-labelledby="closed-heading">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-leaf-soft text-forest">
        <MessageCircle size={30} aria-hidden="true" />
      </div>
      <h1 id="closed-heading" className="mt-5 font-display text-3xl font-black text-forest">Online ordering is not open yet</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
        We are not taking online payments yet. Send us an enquiry with what you would like and our team will get back to you.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <EnquiryButton name={subject} imageUrl={items[0]?.imageUrl ?? FALLBACK_IMAGE} large />
        <Link href="/cart" className="inline-flex min-h-11 items-center text-sm font-bold text-forest underline underline-offset-4">Back to cart</Link>
      </div>
    </div>
  );
}
