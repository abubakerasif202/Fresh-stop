export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-soft" aria-hidden="true">
      <div className="skeleton aspect-4/3 w-full" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="skeleton h-5 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-1/4 rounded-full" />
        <div className="flex items-center justify-between pt-3">
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-10 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
