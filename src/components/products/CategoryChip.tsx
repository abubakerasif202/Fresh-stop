import Link from "next/link";

const TINTS: Record<string, string> = {
  fruits: "bg-citrus/15 text-citrus-deep",
  vegetables: "bg-leaf-soft text-forest",
  boxes: "bg-sun/30 text-ink",
  dairy: "bg-peach text-ink",
  pantry: "bg-cream-deep text-ink"
};

/** Colour-coded category pill; the dot makes the category scannable on a busy grid. */
export function CategoryChip({ href, name, slug }: { href: string; name: string; slug?: string }) {
  const tint = (slug && TINTS[slug]) || "bg-cream-deep text-ink";
  return (
    <Link href={href} className={`mb-1.5 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider hover:underline ${tint}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {name}
    </Link>
  );
}
