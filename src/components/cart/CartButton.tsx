"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

export function CartButton() {
  const { totals, openCart } = useCart();
  const count = totals.itemCount;

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Shopping cart with ${count} items`}
      className="relative flex h-11 items-center gap-2 rounded-full border border-forest/20 bg-white px-3.5 text-forest transition hover:bg-leaf-soft hover:border-forest/40 focus-visible:outline-3 focus-visible:outline-citrus"
    >
      <ShoppingBag size={18} className="text-forest" aria-hidden="true" />
      <span className="hidden text-sm font-extrabold sm:inline">
        {totals.subtotal > 0 ? `$${totals.subtotal.toFixed(2)}` : "Cart"}
      </span>
      {count > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-red px-1.5 text-[11px] font-black text-white shadow-xs">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
