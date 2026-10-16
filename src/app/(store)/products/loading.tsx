import { Mascot } from "@/components/motion";
import { ProductCardSkeleton } from "@/components/products/ProductCardSkeleton";
import { ProductGrid } from "@/components/products/ProductGrid";
import "@/styles/catalogue-motion.css";

/** Skeleton mirrors the page layout (hero, search, tabs, grid) so content swaps in without layout shift. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading products">
      <div className="border-b border-forest/10 bg-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-10 sm:py-14">
          <div className="min-w-0 flex-1">
            <div className="sk mb-4 h-3 w-40 rounded-full" />
            <div className="sk mb-3 h-10 w-72 max-w-full rounded-full sm:h-14" />
            <div className="sk h-10 w-56 max-w-full rounded-full sm:h-14" />
            <div className="sk mt-5 h-4 w-96 max-w-full rounded-full" />
          </div>
          <div className="hidden md:block"><Mascot kind="strawberry" animation="bounce" size={120} /></div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="sk mb-6 h-12 max-w-2xl rounded-full" />
        <div className="mb-8 flex gap-2 overflow-hidden border-b-2 border-forest/10 pb-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="sk h-9 w-24 shrink-0 rounded-full" />)}
        </div>
        <ProductGrid>
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </ProductGrid>
        <span className="sr-only">Loading products…</span>
      </div>
    </div>
  );
}
