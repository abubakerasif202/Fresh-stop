import { db } from "@/lib/db";
import { HeroBanner } from "@/components/home/HeroBanner";
import { StoresShowcase } from "@/components/home/StoresShowcase";
import { ProductCard } from "@/components/products/ProductCard";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";

export const revalidate = 60;

export default async function HomePage() {
  const [specials, seasonalBoxes, allCategories] = await Promise.all([
    db.product.findMany({
      where: { isSpecial: true },
      include: { category: true },
      take: 8
    }),
    db.product.findMany({
      where: { category: { slug: "boxes" } },
      include: { category: true }
    }),
    db.category.findMany({
      orderBy: { displayOrder: "asc" }
    })
  ]);

  return (
    <div>
      <HeroBanner />

      {/* Category Shortcuts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <nav aria-label="Product Categories" className="flex items-center gap-3 overflow-x-auto pb-2">
            <Link
              href="/products"
              className="bg-white border border-slate-200 hover:border-green-600 hover:text-green-700 px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition"
            >
              All Produce
            </Link>
            {allCategories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="bg-white border border-slate-200 hover:border-green-600 hover:text-green-700 px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* Weekly Specials Section */}
      <section className="py-16 max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full mb-2">
              <Flame className="h-3.5 w-3.5" /> Best Deals This Week
            </div>
            <h2 className="text-3xl font-black text-slate-900">Weekly Specials</h2>
          </div>
          <Link
            href="/products?special=true"
            className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1"
          >
            View All Specials <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {specials.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
            Check back soon for next week’s seasonal specials!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {specials.map((p) => (
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
      </section>

      {/* Seasonal Boxes Banner Section */}
      {seasonalBoxes.length > 0 && (
        <section className="py-16 bg-emerald-50/50 border-t border-emerald-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="max-w-2xl mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                Hand-Picked Variety
              </span>
              <h2 className="text-3xl font-black text-slate-900 mt-2">Curated Produce Boxes</h2>
              <p className="text-sm text-slate-600 mt-1">
                Save time with chef-designed combinations of seasonal fruits, root vegetables, and cooking staples.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {seasonalBoxes.map((b) => (
                <ProductCard
                  key={b.id}
                  id={b.id}
                  name={b.name}
                  slug={b.slug}
                  price={b.price}
                  unit={b.unit}
                  compareAtPrice={b.compareAtPrice}
                  isSpecial={b.isSpecial}
                  specialPrice={b.specialPrice}
                  imageUrl={b.imageUrl}
                  categoryName={b.category.name}
                  categorySlug={b.category.slug}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 2 Branches Showcase */}
      <StoresShowcase />
    </div>
  );
}
