import { ProductCardSkeleton } from "@/components/products/ProductCardSkeleton";
import { ProductGrid } from "@/components/products/ProductGrid";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10" role="status" aria-label="Loading products">
      <div className="mb-8 space-y-3">
        <div className="skeleton h-9 w-72 max-w-full rounded-full" />
        <div className="skeleton h-4 w-96 max-w-full rounded-full" />
      </div>
      <div className="mb-8 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-24 rounded-full" />
        ))}
      </div>
      <ProductGrid>
        {Array.from({ length: 10 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </ProductGrid>
      <span className="sr-only">Loading products…</span>
    </div>
  );
}
