"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { formatCents } from "@/lib/cart-core";
import { productEnquiryLinks } from "@/lib/contact";

/** A local shopping-list review: no order, reservation, payment session or customer details are submitted. */
export function OrderPreview() {
  const { items, ready, estimatedSubtotalCents, refreshCart } = useCart();
  useEffect(() => { if (ready) void refreshCart(); }, [ready, refreshCart]);
  const enquiry = productEnquiryLinks(`my shopping list: ${items.map(l => `${l.name} x ${l.quantity} (${l.unit})`).join(", ")}. Indicative subtotal ${formatCents(estimatedSubtotalCents)} AUD; please confirm prices, availability and delivery`);
  if (!ready) return <div className="container py-16" aria-busy="true">Loading your order preview…</div>;
  return <section className="mx-auto max-w-5xl px-4 py-8 sm:py-14">
    <Link href="/cart" className="inline-flex min-h-11 items-center font-bold text-forest underline">Back to cart</Link>
    <h1 className="mt-3 font-display text-3xl font-black text-forest sm:text-4xl">Your order preview</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">Review your shopping list with indicative AUD prices. Fresh Stop will confirm final prices, availability and delivery before you place an order. Online payments are not open yet.</p>
    {items.length === 0 ? <Link href="/products" className="button button-green mt-6">Browse groceries</Link> : <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_320px]">
      <ul className="divide-y divide-forest/10 rounded-2xl border border-forest/10 bg-white px-4">{items.map(line => <CartLineItem key={line.productId} line={line} />)}</ul>
      <aside className="rounded-2xl border border-forest/10 bg-white p-6">
        <h2 className="font-display text-xl font-black text-forest">Shopping list summary</h2>
        <div className="mt-5 flex justify-between gap-3 font-bold"><span>Indicative subtotal</span><span>{formatCents(estimatedSubtotalCents)} AUD</span></div>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">Delivery, minimum order and any applicable tax details will be confirmed by Fresh Stop. This preview does not reserve stock or place an order.</p>
        <div className="mt-6 flex flex-col gap-3"><a href={enquiry.whatsapp} target="_blank" rel="noopener noreferrer" className="button button-green min-h-12 justify-center">Enquire on WhatsApp<span className="sr-only"> (opens in a new tab)</span></a><a href={enquiry.email} className="inline-flex min-h-11 items-center justify-center text-sm font-bold text-forest underline">Email this shopping list</a></div>
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">Your enquiry opens for you to review before sending. No payment is requested.</p>
      </aside>
    </div>}
  </section>;
}
