import { db } from "@/lib/db";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductGrid } from "@/components/products/ProductGrid";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Prisma } from "@prisma/client";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{
    category?: string;
    special?: string;
    q?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const categorySlug = params.category;
  const isSpecialOnly = params.special === "true";
  const searchQuery = params.q?.trim() || "";

  const where: Prisma.ProductWhereInput = {};
  if (categorySlug) where.category = { slug: categorySlug };
  if (isSpecialOnly) where.isSpecial = true;
  if (searchQuery) where.name = { contains: searchQuery };

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" }
    }),
    db.category.findMany({ orderBy: { displayOrder: "asc" } })
  ]);

  const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) : null;
  const hasFilters = Boolean(categorySlug || isSpecialOnly || searchQuery);
  const clearSearchHref = `/products${
    categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : isSpecialOnly ? "?special=true" : ""
  }`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
            {activeCategory
              ? activeCategory.name
              : isSpecialOnly
              ? "Weekly Specials"
              : searchQuery
              ? `Results for “${searchQuery}”`
              : "All Fresh Produce"}
          </h1>
          <p className="mt-1 text-sm text-ink/70" aria-live="polite">
            {products.length} {products.length === 1 ? "item" : "items"} available for Click &amp; Collect or Sydney delivery.
          </p>
        </div>

        <form action="/products" method="GET" role="search" className="relative w-full md:w-80">
          {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
          {isSpecialOnly && <input type="hidden" name="special" value="true" />}
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/50" aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search produce..."
            aria-label="Search produce"
            className="w-full rounded-full bg-white py-2.5 pl-11 pr-10 text-sm text-ink shadow-soft ring-1 ring-ink/10 transition placeholder:text-ink/50 focus:ring-2 focus:ring-forest"
          />
          {searchQuery && (
            <Link
              href={clearSearchHref}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink/60 hover:text-ink"
              aria-label="Clear search query"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </form>
      </div>

      <ProductFilters
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        categorySlug={categorySlug}
        isSpecialOnly={isSpecialOnly}
        searchQuery={searchQuery}
      />

      {products.length === 0 ? (
        <div className="animate-rise rounded-3xl bg-white px-6 py-16 text-center shadow-soft ring-1 ring-ink/5">
          <p className="font-display text-xl font-bold text-ink">Nothing fresh matches that</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink/70">
            Try a different spelling, another category, or clear your filters to see everything we have in.
          </p>
          {hasFilters && (
            <Link
              href="/products"
              className="mt-6 inline-flex items-center rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white transition hover:bg-forest/90"
            >
              Clear all filters
            </Link>
          )}
        </div>
      ) : (
        <ProductGrid>
          {products.map((p, index) => (
            <ProductCard
              key={p.id}
              priority={index < 4}
              headingLevel="h2"
              id={p.id}
              name={p.name}
              slug={p.slug}
              price={p.price}
              unit={p.unit}
              compareAtPrice={p.compareAtPrice}
              isSpecial={p.isSpecial}
              specialPrice={p.specialPrice}
              imageUrl={p.imageUrl}
              categoryName={p.category.name}
              categorySlug={p.category.slug}
            />
          ))}
        </ProductGrid>
      )}
    </div>
  );
}
