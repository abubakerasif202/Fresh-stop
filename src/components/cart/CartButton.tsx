"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

export function CartButton() {
  const { itemCount, ready, openCart } = useCart();
  const [announcement, setAnnouncement] = useState("");
  const previous = useRef<number | null>(null);

  // Announce count changes to screen readers, but not the initial load from storage.
  useEffect(() => {
    if (!ready) return;
    if (previous.current !== null && previous.current !== itemCount) {
      setAnnouncement(itemCount === 0 ? "Cart is empty" : `Cart updated: ${itemCount} ${itemCount === 1 ? "item" : "items"}`);
    }
    previous.current = itemCount;
  }, [itemCount, ready]);

  return (
    <>
      <button
        type="button"
        onClick={openCart}
        aria-label={`Open shopping cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
        aria-haspopup="dialog"
        className="relative flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-forest/20 bg-white px-3 text-forest transition hover:border-forest/40 hover:bg-leaf-soft focus-visible:outline-3 focus-visible:outline-citrus"
      >
        <ShoppingBag size={18} className="text-forest" aria-hidden="true" />
        <span className="hidden text-sm font-extrabold sm:inline" aria-hidden="true">Cart</span>
        {itemCount > 0 && (
          <span aria-hidden="true" className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-red px-1.5 text-[11px] font-black text-white shadow-xs">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">{announcement}</span>
    </>
  );
}
