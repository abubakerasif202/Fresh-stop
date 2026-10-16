import "@/styles/catalogue-motion.css";

/** Mirrors ProductCard's box model (square image, chip, two-line title, 44px button) so nothing shifts on load. */
export function ProductCardSkeleton() {
  return (
    <div className="sk-card overflow-hidden rounded-3xl border border-forest/10 bg-white" aria-hidden="true">
      <div className="sk aspect-square w-full" />
      <div className="p-3 sm:p-5">
        <div className="sk mb-2 h-6 w-24 rounded-full" />
        <div className="sk mb-2 h-6 w-4/5 rounded-full sm:h-7" />
        <div className="sk mb-4 h-6 w-1/2 rounded-full sm:h-7" />
        <div className="sk h-11 w-full rounded-full" />
      </div>
    </div>
  );
}
