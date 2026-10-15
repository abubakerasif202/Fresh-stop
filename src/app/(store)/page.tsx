import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { HeroBanner } from "@/components/home/HeroBanner";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { FulfilmentSection } from "@/components/home/FulfilmentSection";
import { StoresShowcase } from "@/components/home/StoresShowcase";
import { ProductCard } from "@/components/products/ProductCard";
import { Reveal } from "@/components/ui/Reveal";

export const revalidate = 60;

export default async function HomePage() {
  const [specials, boxes, boxesCategory, categories] = await Promise.all([
    db.product.findMany({ where: { isSpecial: true }, include: { category: true }, take: 8 }),
    db.product.findMany({ where: { category: { slug: "boxes" } }, include: { category: true } }),
    db.category.findUnique({ where: { slug: "boxes" } }),
    db.category.findMany({
      orderBy: { displayOrder: "asc" },
      include: { products: { where: { imageUrl: { not: "" } }, take: 1, select: { name: true, imageUrl: true } } }
    })
  ]);

  const tiles = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    imageUrl: c.products[0]?.imageUrl ?? null
  }));

  // One product image per category (first four) for the hero collage.
  const heroProduce = categories
    .filter((c) => c.products[0])
    .slice(0, 3)
    .map((c) => ({ name: c.products[0].name, imageUrl: c.products[0].imageUrl }));

  return (
    <div>
      <HeroBanner produce={heroProduce} />

      <CategoryTiles categories={tiles} />

      <section aria-labelledby="specials-heading" className="bg-cream-deep py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="specials-heading" className="font-display text-4xl font-black leading-none tracking-tight sm:text-6xl">
              Weekly <span className="text-berry-deep">specials</span>
            </h2>
            <Link
              href="/products?special=true"
              className="inline-flex items-center gap-1.5 text-sm font-extrabold text-forest underline-offset-4 hover:underline"
            >
              View all specials <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>

          {specials.length === 0 ? (
            <p className="mt-10 rounded-[2rem] bg-cream p-10 text-center text-sm font-medium text-ink-soft">
              No specials right now. Check back soon.
            </p>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {specials.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 60}>
                  <ProductCard
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
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {boxes.length > 0 && (
        <section aria-labelledby="boxes-heading" className="relative isolate overflow-hidden bg-forest py-16 text-cream lg:py-24">
          <div
            aria-hidden="true"
            className="absolute -right-20 top-10 -z-10 h-72 w-72 bg-leaf/20 animate-float-slow"
            style={{ borderRadius: "58% 42% 52% 48% / 46% 58% 42% 54%" }}
          />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <h2 id="boxes-heading" className="font-display text-4xl font-black leading-none tracking-tight sm:text-6xl">
                {boxesCategory?.name ?? "Seasonal Boxes"}
              </h2>
              {boxesCategory?.description && (
                <p className="mt-4 text-base text-cream/90 sm:text-lg">{boxesCategory.description}</p>
              )}
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {boxes.map((b, i) => (
                <Reveal key={b.id} delay={i * 80}>
                  <ProductCard
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
                </Reveal>
              ))}
            </div>

            <Link
              href="/products?category=boxes"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-sun px-6 py-3 text-sm font-extrabold text-ink transition-transform hover:-translate-y-0.5"
            >
              Shop all boxes <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      <FulfilmentSection />

      <StoresShowcase />
    </div>
  );
}
