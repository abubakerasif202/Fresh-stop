"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Minus, ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { EnquiryButton } from "@/components/enquiry/EnquiryButton";
import { MAX_LINE_QUANTITY, clampQuantity, formatCents } from "@/lib/cart-core";

interface AddToCartButtonProps {
  productId: string;
  slug: string;
  name: string;
  priceCents: number | null;
  unit: string | null;
  imageUrl: string;
  imageAlt?: string | null;
  /** Server verdict. Defaults to false: anything not explicitly purchasable is enquiry-only. */
  isPurchasable?: boolean;
  large?: boolean;
}

const STEP = "grid h-11 w-11 shrink-0 place-items-center rounded-full text-forest hover:bg-leaf-soft focus-visible:outline-3 focus-visible:outline-citrus active:scale-95 transition";

export function AddToCartButton({ productId, slug, name, priceCents, unit, imageUrl, imageAlt, isPurchasable = false, large = false }: AddToCartButtonProps) {
  const { items, addItem, updateQuantity } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const [pending, setPending] = useState(1);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const validCents = typeof priceCents === "number" && Number.isInteger(priceCents) && priceCents > 0;
  if (!isPurchasable || !validCents) return <EnquiryButton name={name} imageUrl={imageUrl} large={large} />;

  const inCart = items.find((i) => i.productId === productId)?.quantity ?? 0;
  const add = (quantity: number) => {
    addItem({ productId, slug, name, unit: unit || "each", imageUrl, imageAlt: imageAlt ?? null, priceCents }, quantity);
    setJustAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setJustAdded(false), 1500);
  };

  if (large) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-forest/25 bg-white" role="group" aria-label={`Quantity of ${name}`}>
            <button type="button" className={STEP} onClick={() => setPending((q) => clampQuantity(q - 1))} disabled={pending <= 1} aria-label={`Decrease quantity of ${name}`}>
              <Minus size={16} aria-hidden="true" />
            </button>
            <span className="w-10 text-center font-display text-base font-black text-forest" aria-live="polite" aria-label={`Quantity ${pending}`}>{pending}</span>
            <button type="button" className={STEP} onClick={() => setPending((q) => clampQuantity(q + 1))} disabled={pending >= MAX_LINE_QUANTITY} aria-label={`Increase quantity of ${name}`}>
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
          <button type="button" onClick={() => add(pending)} className="button button-red min-h-12 flex-1 justify-center px-6 text-base shadow-soft hover:shadow-lift sm:flex-none" aria-label={`Add ${pending} × ${name} to cart for ${formatCents(priceCents * pending)} estimated`}>
            {justAdded ? <Check size={19} aria-hidden="true" /> : <ShoppingBag size={19} aria-hidden="true" />}
            <span>{justAdded ? "Added to cart" : "Add to Cart"}</span>
          </button>
        </div>
        {inCart > 0 && (
          <p className="mt-3 text-sm font-bold text-forest" role="status">
            {inCart} in your cart. <Link href="/cart" className="underline underline-offset-2">View cart</Link>
          </p>
        )}
      </div>
    );
  }

  if (inCart > 0) {
    return (
      <div className="flex h-11 w-full items-center justify-between rounded-full border border-forest/30 bg-white px-0.5">
        <button type="button" onClick={() => updateQuantity(productId, inCart - 1)} className={STEP} aria-label={`Decrease ${name} quantity`}>
          <Minus size={15} aria-hidden="true" />
        </button>
        <span className="min-w-0 text-center font-display text-xs font-black text-forest" aria-label={`${inCart} in cart`}>{inCart}</span>
        <button type="button" onClick={() => updateQuantity(productId, inCart + 1)} className={STEP} aria-label={`Increase ${name} quantity`}>
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => add(1)}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-forest px-4 font-display text-xs font-black text-cream transition hover:bg-deep-green focus-visible:outline-3 focus-visible:outline-citrus active:scale-98 sm:text-sm"
      aria-label={`Add ${name} to cart for ${formatCents(priceCents)}`}
    >
      {justAdded ? <Check size={16} aria-hidden="true" /> : <ShoppingBag size={15} aria-hidden="true" />}
      <span>{justAdded ? "Added" : "Add to Cart"}</span>
    </button>
  );
}
