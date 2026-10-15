"use client";

import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/lib/store/useCartStore";
import { Plus, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
}

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
  categorySlug
}: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const displayPrice = isSpecial && specialPrice ? specialPrice : price;
  const originalPrice = isSpecial && specialPrice ? price : compareAtPrice;

  const handleAdd = () => {
    addItem({ id, name, slug, price: displayPrice, unit, imageUrl }, 1);
    setJustAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setJustAdded(false), 1200);
  };

  const productTargetUrl = categorySlug ? `/products?category=${categorySlug}` : "/products";

  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300">
      <Link href={productTargetUrl} className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden block">
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {isSpecial && (
          <div className="absolute top-3 left-3 bg-red-600 text-white font-bold text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
            Weekly Special
          </div>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {categoryName && (
            <Link
              href={productTargetUrl}
              className="text-[11px] font-semibold uppercase tracking-wider text-green-700 hover:text-green-800 block mb-1"
            >
              {categoryName}
            </Link>
          )}
          <Link href={productTargetUrl}>
            <h3 className="font-bold text-slate-900 group-hover:text-green-700 transition line-clamp-1">
              {name}
            </h3>
          </Link>
          <p className="text-xs text-slate-500 mt-0.5">Per {unit}</p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900">
                ${displayPrice.toFixed(2)}
              </span>
              {originalPrice && originalPrice > displayPrice && (
                <span className="text-xs text-slate-500 line-through">
                  ${originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleAdd}
            aria-label={justAdded ? `Added ${name} to cart` : `Add ${name} to cart`}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              justAdded
                ? "bg-green-800 text-white"
                : "bg-green-700 hover:bg-green-800 text-white shadow-xs"
            }`}
          >
            {justAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{justAdded ? "Added" : "Add"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
