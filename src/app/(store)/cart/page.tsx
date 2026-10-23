"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { CartNotices } from "@/components/cart/CartNotices";
import { CartSummary } from "@/components/cart/CartSummary";

export default function CartPage() {
  const { items, ready, itemCount, clearCart, refreshCart } = useCart();

  useEffect(() => {
    if (ready) void refreshCart();
  }, [ready, refreshCart]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center" aria-busy="true">
        <h1 className="font-display text-3xl font-black text-forest">Shopping Cart</h1>
        <p className="mt-3 text-sm text-ink-soft">Loading your cart…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-leaf-soft text-forest">
          <ShoppingBag size={44} aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-black text-forest sm:text-4xl">Your shopping cart is empty</h1>
        <p className="mx-auto mt-3 max-w-md text-base text-ink-soft">
          Browse the catalogue. Products that can be ordered online have an Add to Cart button; for everything else you can send us an enquiry.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/products" className="button button-green min-h-12">
            Browse products <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <Link href="/products" className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-forest hover:underline">
            <ArrowLeft size={14} aria-hidden="true" /> Continue shopping
          </Link>
          <h1 className="font-display text-3xl font-black tracking-tight text-forest sm:text-4xl">Shopping Cart</h1>
          <p className="text-sm text-ink-soft">{itemCount} {itemCount === 1 ? "item" : "items"} in your cart</p>
        </div>
        <button type="button" onClick={clearCart} className="min-h-11 self-start text-xs font-bold text-ink-soft hover:text-brand-red sm:self-auto">
          Clear cart
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 lg:col-span-8">
          <CartNotices />
          <ul className="divide-y divide-forest/10 rounded-2xl border border-forest/10 bg-white px-4 shadow-soft sm:px-5">
            {items.map((line) => (
              <CartLineItem key={line.productId} line={line} imageSize={80} />
            ))}
          </ul>
        </div>
        <aside className="lg:col-span-4" aria-label="Order summary">
          <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft sm:p-6">
            <h2 className="mb-4 font-display text-xl font-black text-forest">Order summary</h2>
            <CartSummary size="lg" />
          </div>
        </aside>
      </div>
    </div>
  );
}
