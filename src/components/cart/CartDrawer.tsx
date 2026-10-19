"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { CartLineItem } from "./CartLineItem";
import { CartNotices } from "./CartNotices";
import { CartSummary } from "./CartSummary";
import { useFocusTrap } from "./useFocusTrap";

export function CartDrawer() {
  const { items, isOpen, closeCart, itemCount, refreshCart } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, panelRef, closeCart);

  useEffect(() => {
    if (isOpen) void refreshCart();
  }, [isOpen, refreshCart]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
      <div className="fixed inset-0 bg-forest/40 backdrop-blur-xs" onClick={closeCart} aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
        <div ref={panelRef} className="flex h-dvh w-[calc(100vw-1.5rem)] max-w-md flex-col bg-cream shadow-2xl sm:w-screen">
          <div className="flex items-center justify-between gap-2 border-b border-forest/10 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <ShoppingBag className="shrink-0 text-forest" size={22} aria-hidden="true" />
              <h2 id="cart-drawer-title" className="truncate font-display text-lg font-black text-forest sm:text-xl">Your Fresh Basket</h2>
              <span className="rounded-full bg-leaf-soft px-2.5 py-0.5 text-xs font-bold text-forest">{itemCount}</span>
            </div>
            <button type="button" onClick={closeCart} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-forest/10 hover:text-forest focus-visible:outline-3 focus-visible:outline-citrus" aria-label="Close cart">
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-leaf-soft text-forest">
                  <ShoppingBag size={32} aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-lg font-black text-forest">Your basket is empty</h3>
                <p className="mt-2 max-w-xs text-sm text-ink-soft">Browse the catalogue. Items that can be ordered online show an Add to Cart button.</p>
                <Link href="/products" onClick={closeCart} className="button button-green mt-6 min-h-11">
                  Browse products <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <>
                <CartNotices />
                <ul className="divide-y divide-forest/10">
                  {items.map((line) => (
                    <CartLineItem key={line.productId} line={line} onNavigate={closeCart} />
                  ))}
                </ul>
              </>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-forest/15 bg-white p-4 sm:p-5">
              <CartSummary onNavigate={closeCart} />
              <Link href="/cart" onClick={closeCart} className="button button-outline mt-2 min-h-11 w-full justify-center text-center text-xs text-forest">
                View full cart
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
