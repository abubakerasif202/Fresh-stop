import type { Metadata } from "next";
import { sortCatalogue } from "@/lib/catalogue";
import { ShoppingMemory } from "@/components/products/ShoppingMemory";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductGrid } from "@/components/products/ProductGrid";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Shop fresh produce", alternates: { canonical: "/products" } };

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{
    category?: string;
    special?: string;
    q?: string;
    sort?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const categorySlug = params.category;
  const isSpecialOnly = params.special === "true";
  const searchQuery = params.q?.trim() || "";

  const where: Prisma.ProductWhereInput = { isPublished: true };
  if (categorySlug) where.category = { slug: categorySlug };
  if (isSpecialOnly) where.isSpecial = true;
  if (searchQuery) where.name = { contains: searchQuery, mode: "insensitive" };

  const [catalogue, categories] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true, inventory: { where: { isAvailable: true, storeBranch: { isActive: true } }, select: { storeBranch: { select: { slug: true } } } } },
      orderBy: { createdAt: "desc" }
    }),
    db.category.findMany({ orderBy: { displayOrder: "asc" } })
  ]);

  const products = sortCatalogue(catalogue, params.sort);
  const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) : null;
  const hasFilters = Boolean(categorySlug || isSpecialOnly || searchQuery);
  const clearSearchParams = new URLSearchParams({ ...(categorySlug ? { category: categorySlug } : {}), ...(isSpecialOnly ? { special: "true" } : {}), ...(params.sort ? { sort: params.sort } : {}) });
  const clearSearchHref = `/products?${clearSearchParams.toString()}`;

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
            {products.length} {products.length === 1 ? "item" : "items"} in our catalogue. Check store availability on each product.
          </p>
        </div>

        <form action="/products" method="GET" role="search" className="relative w-full md:w-80">
          {params.sort && <input type="hidden" name="sort" value={params.sort} />}
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

      <form action="/products" className="mb-5 flex flex-wrap items-center justify-end gap-3">
        {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
        {isSpecialOnly && <input type="hidden" name="special" value="true" />}
        {searchQuery && <input type="hidden" name="q" value={searchQuery} />}
        <label htmlFor="catalogue-sort" className="text-sm font-semibold">Sort by</label>
        <select id="catalogue-sort" name="sort" defaultValue={params.sort ?? "newest"} className="min-h-11 rounded-full border border-forest/20 bg-white px-4 text-sm">
          <option value="newest">Newest first</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A to Z</option>
        </select>
        <button className="min-h-11 rounded-full bg-forest px-4 text-sm font-semibold text-white">Apply</button>
      </form>
      <ProductFilters
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        categorySlug={categorySlug}
        isSpecialOnly={isSpecialOnly}
        searchQuery={searchQuery}
        sort={params.sort}
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
              index={index}
              headingLevel="h2"
              id={p.id}
              name={p.name}
              slug={p.slug}
              price={p.price}
              unit={p.unit}
              imageAlt={p.imageAlt}
              compareAtPrice={p.compareAtPrice}
              isSpecial={p.isSpecial}
              specialPrice={p.specialPrice}
              imageUrl={p.imageUrl}
              categoryName={p.category.name}
              categorySlug={p.category.slug}
                    availableBranches={p.inventory.map((i) => i.storeBranch.slug)}
            />
          ))}
        </ProductGrid>
      )}
      <ShoppingMemory />
    </div>
  );
}
