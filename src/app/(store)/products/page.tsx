import { db } from "@/lib/db";
import { ProductCard } from "@/components/products/ProductCard";
import Link from "next/link";
import { Search, Flame, X } from "lucide-react";
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Title & Count Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            {activeCategory
              ? activeCategory.name
              : isSpecialOnly
              ? "Weekly Produce Specials"
              : searchQuery
              ? `Search results for "${searchQuery}"`
              : "All Fresh Produce & Groceries"}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Showing {products.length} farm-fresh {products.length === 1 ? "item" : "items"} available for Click & Collect or Sydney delivery.
          </p>
        </div>

        {/* Search Bar Form */}
        <form action="/products" method="GET" className="relative w-full md:w-72">
          {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
          {isSpecialOnly && <input type="hidden" name="special" value="true" />}
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search produce..."
              aria-label="Search produce"
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-green-600 transition"
            />
            {searchQuery && (
              <Link
                href={`/products${categorySlug ? `?category=${categorySlug}` : isSpecialOnly ? `?special=true` : ""}`}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Clear search query"
              >
                <X className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Filter Tabs / Pills */}
      <nav aria-label="Catalog Filters" className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b border-slate-200">
        <Link
          href={`/products${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            !categorySlug && !isSpecialOnly
              ? "bg-green-700 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All
        </Link>
        <Link
          href={`/products?special=true${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
          className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            isSpecialOnly
              ? "bg-red-600 text-white"
              : "bg-red-50 text-red-700 hover:bg-red-100"
          }`}
        >
          <Flame className="h-3 w-3" />
          <span>Specials Only</span>
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/products?category=${c.slug}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              categorySlug === c.slug
                ? "bg-green-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      {/* Products Grid or Empty State */}
      {products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8">
          <p className="text-slate-700 font-semibold text-base mb-1">No products found</p>
          <p className="text-slate-500 text-xs mb-4">
            We couldn’t find any produce matching your current filter criteria.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            Reset Filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((p) => (
            <ProductCard
              key={p.id}
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
        </div>
      )}
    </div>
  );
}
