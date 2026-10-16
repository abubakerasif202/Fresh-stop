import Link from "next/link";

const TINTS: Record<string, string> = {
  fruits: "bg-citrus/15 text-citrus-deep",
  vegetables: "bg-leaf-soft text-forest",
  "leafy-greens": "bg-leaf-soft text-forest",
  herbs: "bg-lime/50 text-forest",
  "specialty-produce": "bg-peach text-citrus-deep",
  boxes: "bg-sun/30 text-ink",
  dairy: "bg-peach text-ink",
  pantry: "bg-cream-deep text-ink",
  frozen: "bg-sky-100 text-sky-900",
  drinks: "bg-sun/30 text-ink"
};

/** Colour-coded category pill; the dot makes the category scannable on a busy grid. */
export function CategoryChip({ href, name, slug }: { href: string; name: string; slug?: string }) {
  const tint = (slug && TINTS[slug]) || "bg-cream-deep text-ink";
  return (
    <Link href={href} className={`mb-2 inline-flex min-h-6 w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider transition-transform hover:-translate-y-px hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 ${tint}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {name}
    </Link>
  );
}
