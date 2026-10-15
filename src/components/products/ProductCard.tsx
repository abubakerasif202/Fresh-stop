"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ShoppingBasket } from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";
import { QuantityStepper } from "./QuantityStepper";

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  unit: string;
  compareAtPrice?: number | null;
  isSpecial?: boolean;
  specialPrice?: number | null;
  imageUrl: string;
  categoryName?: string;
  categorySlug?: string;
  /** Load eagerly (above-the-fold / LCP candidates). */
  priority?: boolean;
  headingLevel?: "h2" | "h3";
}

const ADDED_FLASH_MS = 1200;

export function ProductCard({
  id,
  name,
  slug,
  price,
  unit,
  compareAtPrice,
  isSpecial,
  specialPrice,
  imageUrl,
  categoryName,
  categorySlug,
  priority = false,
  headingLevel = "h3"
}: ProductCardProps) {
  const Heading = headingLevel;
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const cartQuantity = useCartStore((s) => s.items.find((i) => i.id === id)?.quantity ?? 0);

  // Hydration-safe: persisted cart is only trusted after mount.
  const [mounted, setMounted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const hasSpecialPrice = Boolean(isSpecial && specialPrice);
  const displayPrice = hasSpecialPrice ? (specialPrice as number) : price;
  const originalPrice = hasSpecialPrice ? price : compareAtPrice;
  const saving = hasSpecialPrice ? price - displayPrice : 0;
  const showSaving = hasSpecialPrice && saving > 0;
  const showStepper = mounted && cartQuantity > 0;

  const handleAdd = () => {
    addItem({ id, name, slug, price: displayPrice, unit, imageUrl }, 1);
    setJustAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setJustAdded(false), ADDED_FLASH_MS);
  };

  const targetUrl = categorySlug ? `/products?category=${encodeURIComponent(categorySlug)}` : "/products";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-ink/5 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link
        href={targetUrl}
        aria-hidden="true"
        tabIndex={-1}
        className="relative block aspect-4/3 w-full overflow-hidden bg-cream"
      >
        <Image
          src={imageUrl}
          alt={name}
          fill
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {showSaving && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-sun px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink shadow-soft">
            Special · Save ${saving.toFixed(2)}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {categoryName && (
          <Link
            href={targetUrl}
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-forest hover:underline"
          >
            {categoryName}
          </Link>
        )}
        <Heading className="font-display line-clamp-2 text-base font-bold leading-snug text-ink">{name}</Heading>
        <p className="mt-0.5 text-xs text-ink/70">Per {unit}</p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-4">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-xl font-extrabold text-ink">${displayPrice.toFixed(2)}</span>
            {originalPrice != null && originalPrice > displayPrice && (
              <span className="text-xs text-ink-soft line-through">
                <span className="sr-only">Was </span>${originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {showStepper ? (
            <QuantityStepper name={name} quantity={cartQuantity} onChange={(q) => updateQuantity(id, q)} />
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              aria-label={justAdded ? `Added ${name} to cart` : `Add ${name} to cart`}
              className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors active:scale-95 ${
                justAdded ? "bg-leaf text-ink" : "bg-forest text-white hover:bg-forest/90"
              }`}
            >
              <span key={justAdded ? "added" : "idle"} className="animate-pop inline-flex">
                {justAdded ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <span>{justAdded ? "Added" : "Add"}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
