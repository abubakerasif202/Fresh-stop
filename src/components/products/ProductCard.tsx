import Image from "next/image";
import { indicativePrice } from "@/lib/indicative-pricing";
import { formatUnitPrice } from "@/lib/product-commerce";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CategoryChip } from "./CategoryChip";
import { categoryLabel } from "./category-order";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { GENERIC_ILLUSTRATION_DISCLOSURE, isGenericCatalogueIllustration } from "@/data/catalogue-illustrations";
import "@/styles/catalogue-motion.css";

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  imageAlt?: string | null;
  imageKind?: "ai" | "photo" | "placeholder";
  categoryName?: string;
  categorySlug?: string;
  price?: number | null;
  priceCents?: number | null;
  indicativePriceCents?: number | null;
  indicativeUnit?: string | null;
  packageQuantity?: number;
  compareAtPrice?: number | null;
  unit?: string | null;
  unitPriceDisplay?: string | null;
  taxCategory?: "GST_FREE" | "TAXABLE_10";
  isPurchasable?: boolean;
  priority?: boolean;
  headingLevel?: "h2" | "h3";
  index?: number;
}

/** Stagger is capped so late items never wait; scroll-driven browsers reveal on entry instead. */
const MAX_STAGGER = 8;

export function ProductCard({
  id,
  name,
  slug,
  imageUrl,
  imageAlt,
  imageKind,
  categoryName,
  categorySlug,
  price = null,
  priceCents = null,
  indicativePriceCents = null,
  indicativeUnit = null,
  packageQuantity,
  compareAtPrice = null,
  unit = null,
  unitPriceDisplay = null,
  isPurchasable = false,
  priority = false,
  headingLevel = "h3",
  index = 0
}: ProductCardProps) {
  const demo = indicativePrice(slug, { indicativePriceCents, indicativeUnit, packageQuantity });
  if (demo) {
    priceCents = demo.priceCents;
    price = demo.priceCents / 100;
    unit = demo.unit;
    unitPriceDisplay = formatUnitPrice(price, unit, demo.packageQuantity);
    compareAtPrice = null;
  }
  const Heading = headingLevel;
  const isAi = imageKind === "ai" || imageUrl.includes("/ai/");
  const label = categoryName ? categoryLabel({ name: categoryName, slug: categorySlug ?? "" }) : undefined;
  const href = `/products/${encodeURIComponent(slug)}`;

  // A price is presented only when the server says the product can be bought online. Everything else is enquiry-only.
  const canBuy = (isPurchasable || demo !== null) && typeof price === "number" && price > 0 && typeof priceCents === "number" && priceCents > 0;
  const displayPrice = price ?? 0;
  const wasPrice = canBuy && typeof compareAtPrice === "number" && compareAtPrice > displayPrice ? compareAtPrice : null;
  const showWas = wasPrice !== null;

  return (
    <div className="pc h-full rounded-3xl" style={{ "--i": Math.min(index, MAX_STAGGER) } as CSSProperties}>
      <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-forest/10 bg-white transition-shadow duration-200 hover:shadow-soft">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-square overflow-hidden bg-cream">
          <Image
            src={imageUrl}
            alt={imageAlt || name}
            fill
            priority={priority}
            sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
            className="pc-img object-cover"
          />
          {isAi && (
            <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-ink/70">
              AI illustration
            </span>
          )}
          {imageKind === "placeholder" && (
            <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-ink/70">
              Photo coming soon
            </span>
          )}
          {showWas && (
            <span className="absolute top-2.5 right-2.5 rounded-full bg-brand-red px-2 py-0.5 text-[11px] font-black text-white shadow-xs">
              Special
            </span>
          )}
        </Link>
        <div className="flex flex-1 flex-col p-3.5 sm:p-5">
          {label && (
            <CategoryChip
              href={`/products?category=${encodeURIComponent(categorySlug || "")}`}
              name={label}
              slug={categorySlug}
            />
          )}
          <Heading className="mb-2 font-display text-base font-extrabold leading-tight text-forest sm:text-lg">
            <Link
              href={href}
              className="line-clamp-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {name}
            </Link>
          </Heading>

          {isGenericCatalogueIllustration(imageUrl) && <p className="mb-4 text-xs leading-relaxed text-ink-soft">{GENERIC_ILLUSTRATION_DISCLOSURE}</p>}
          {/* Pricing hierarchy */}
          <div className="mb-4">
            {canBuy ? (
              <div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="font-display text-xl font-black text-forest sm:text-2xl">
                    ${displayPrice.toFixed(2)}
                  </span>
                  {unit && <span className="text-xs font-bold text-ink-soft">/ {unit}</span>}
                  {showWas && (
                    <span className="text-xs text-ink-soft line-through">
                      ${wasPrice?.toFixed(2)}
                    </span>
                  )}
                </div>
                {demo && <p className="mt-1 text-[11px] font-bold text-ink-soft">Indicative price - AUD</p>}
                {unitPriceDisplay && (
                  <p className="mt-0.5 text-[11px] font-semibold text-ink-soft">
                    {unitPriceDisplay}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <span className="text-xs font-bold text-ink-soft">Price on enquiry</span>
                <p className="text-[11px] text-ink-soft">Ask our team about availability</p>
              </div>
            )}
          </div>

          <div className="mt-auto pt-2">
            <AddToCartButton
              productId={id}
              slug={slug}
              name={name}
              priceCents={priceCents}
              unit={unit}
              imageUrl={imageUrl}
              imageAlt={imageAlt}
              isPurchasable={canBuy}
            />
          </div>
        </div>
      </article>
    </div>
  );
}
