import Link from "next/link";
import { Mascot } from "@/components/motion";
import { productsHref } from "./category-order";
import "@/styles/catalogue-motion.css";

const SUGGESTIONS = [
  { label: "Fruits", slug: "fruits" }, { label: "Vegetables", slug: "vegetables" },
  { label: "Herbs", slug: "herbs" }, { label: "Pantry", slug: "pantry" }
];

/** Friendly "nothing matched" state: a puzzled orange, ideas to try, and a clear way out. */
export function EmptySearch({ q, categoryLabel }: { q: string; categoryLabel?: string }) {
  return (
    <div className="soft-pop rounded-3xl border border-forest/10 bg-white px-6 py-14 text-center">
      <div className="relative mx-auto mb-5 w-fit">
        <span className="empty-wobble"><Mascot kind="orange" animation="none" size={104} /></span>
        <span aria-hidden="true" className="empty-bubble">?</span>
      </div>
      <h3 className="font-display text-2xl font-extrabold text-forest">Hmm, nothing matched{q ? ` “${q}”` : ""}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/75">
        {categoryLabel ? `We could not find that in ${categoryLabel}. ` : ""}Try a shorter word, check the spelling, or browse a category. If you cannot find it, ask our team about the product you are looking for.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map(s => <Link key={s.slug} href={productsHref(s.slug)} className="cat-chip">{s.label}</Link>)}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="inline-flex min-h-12 items-center rounded-full bg-forest px-6 font-bold text-white hover:bg-forest-deep">Clear filters</Link>
        <Link href="/stores" className="inline-flex min-h-12 items-center rounded-full border border-forest px-6 font-bold text-forest hover:bg-leaf-soft">Ask our team</Link>
      </div>
    </div>
  );
}
