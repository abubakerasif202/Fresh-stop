import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { EnquiryButton } from "@/components/enquiry/EnquiryButton";
import { CategoryChip } from "./CategoryChip";
import { categoryLabel } from "./category-order";
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
  priority?: boolean;
  headingLevel?: "h2" | "h3";
  index?: number;
}

/** Stagger is capped so late items never wait; scroll-driven browsers reveal on entry instead. */
const MAX_STAGGER = 8;

export function ProductCard({ name, slug, imageUrl, imageAlt, imageKind, categoryName, categorySlug, priority = false, headingLevel = "h3", index = 0 }: ProductCardProps) {
  const Heading = headingLevel;
  const isAi = imageKind === "ai" || imageUrl.includes("/ai/");
  const label = categoryName ? categoryLabel({ name: categoryName, slug: categorySlug ?? "" }) : undefined;
  const href = `/products/${encodeURIComponent(slug)}`;
  return (
    <div className="pc h-full rounded-3xl" style={{ "--i": Math.min(index, MAX_STAGGER) } as CSSProperties}>
      <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-forest/10 bg-white">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-square overflow-hidden bg-cream">
          <Image src={imageUrl} alt={imageAlt || name} fill priority={priority} sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw" className="pc-img object-cover" />
          {isAi && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-ink/70">AI illustration</span>}
          {imageKind === "placeholder" && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-ink/70">Photo coming soon</span>}
        </Link>
        <div className="flex flex-1 flex-col p-3 sm:p-5">
          {label && <CategoryChip href={`/products?category=${encodeURIComponent(categorySlug || "")}`} name={label} slug={categorySlug} />}
          <Heading className="mb-4 font-display text-lg font-extrabold leading-tight text-forest sm:text-xl">
            <Link href={href} className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">{name}</Link>
          </Heading>
          {isGenericCatalogueIllustration(imageUrl) && <p className="mb-4 text-xs leading-relaxed text-ink-soft">{GENERIC_ILLUSTRATION_DISCLOSURE}</p>}
          <div className="mt-auto"><EnquiryButton name={name} imageUrl={imageUrl} /></div>
        </div>
      </article>
    </div>
  );
}
