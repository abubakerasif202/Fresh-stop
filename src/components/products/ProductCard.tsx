import Image from "next/image";
import Link from "next/link";
import { EnquireLink } from "./EnquireLink";
import { CategoryChip } from "./CategoryChip";

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

export function ProductCard({ name, slug, imageUrl, imageAlt, imageKind, categoryName, categorySlug, priority = false, headingLevel = "h3", index }: ProductCardProps) {
  const Heading = headingLevel;
  const isAi = imageKind === "ai" || imageUrl.includes("/ai/");
  return <article style={index === undefined ? undefined : { animationDelay: `${Math.min(index, 9) * 40}ms` }} className="animate-rise motion-reduce:animate-none group flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-forest/10 bg-white transition-shadow duration-300 hover:shadow-lift motion-reduce:transition-none">
    <Link href={`/products/${encodeURIComponent(slug)}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-square overflow-hidden bg-cream">
      <Image src={imageUrl} alt={imageAlt || name} fill priority={priority} sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
      {isAi && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-ink/70">AI illustration</span>}
      {imageKind === "placeholder" && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-ink/70">Photo coming soon</span>}
    </Link>
    <div className="flex flex-1 flex-col p-3 sm:p-5">
      {categoryName && <CategoryChip href={`/products?category=${encodeURIComponent(categorySlug || "")}`} name={categoryName} slug={categorySlug} />}
      <Heading className="font-display text-lg font-extrabold leading-tight text-forest sm:text-xl"><Link href={`/products/${encodeURIComponent(slug)}`} className="hover:underline underline-offset-4">{name}</Link></Heading>
      <p className="mb-4 mt-2 text-xs text-ink/65 sm:text-sm">Enquire for details</p>
      <div className="mt-auto"><EnquireLink name={name} fill /></div>
    </div>
  </article>;
}
