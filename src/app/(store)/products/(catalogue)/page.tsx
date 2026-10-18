import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { Search, ArrowUpRight } from "lucide-react";
import { getCatalogue, getCategories } from "@/lib/catalogue-data";
import { SITE_URL } from "@/lib/site";
import { Mascot, PeekingCarrot } from "@/components/motion";
import { ContactCards } from "@/components/enquiry/ContactCards";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductGrid } from "@/components/products/ProductGrid";
import { EmptySearch } from "@/components/products/EmptySearch";
import { categoryLabel } from "@/components/products/category-order";
import { buildBreadcrumbJsonLd, buildItemListJsonLd, buildProductsMetadata, categoryDescription, jsonLdString } from "@/components/products/catalogue-seo";
import "@/styles/catalogue-motion.css";

export const revalidate = 60;
type Props = { searchParams: Promise<{ category?: string | string[]; q?: string | string[] }> };

const loadCategories = cache(getCategories);
const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

async function readParams(searchParams: Props["searchParams"]) {
  const params = await searchParams;
  return { q: first(params.q)?.trim().slice(0, 150) || "", category: first(params.category)?.trim().slice(0, 100) || undefined };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, category } = await readParams(searchParams);
  const active = category ? (await loadCategories()).find(c => c.slug === category) : undefined;
  return buildProductsMetadata(active, q);
}

export default async function ProductsPage({ searchParams }: Props) {
  const { q, category } = await readParams(searchParams);
  const [products, categories] = await Promise.all([getCatalogue({ category, q }), loadCategories()]);
  const activeCategory = categories.find(c => c.slug === category);
  const activeLabel = activeCategory ? categoryLabel(activeCategory) : undefined;
  const categoryImage = products.find(product => product.imageKind !== "placeholder");
  const hasAi = products.some(product => product.imageKind === "ai" || product.imageUrl.includes("/ai/"));
  const listName = activeLabel ? `${activeLabel} catalogue` : "Fresh Stop product catalogue";
  const trail = [{ name: "Home", path: "/" }, { name: "Catalogue", path: "/products" }, ...(activeCategory ? [{ name: activeLabel as string, path: `/products?category=${encodeURIComponent(activeCategory.slug)}` }] : [])];
  const jsonLd = [buildBreadcrumbJsonLd(SITE_URL, trail), buildItemListJsonLd(SITE_URL, listName, q ? [] : products.slice(0, 50))];
  const gridKey = `${category ?? "all"}|${q}`;
  return <>
    {jsonLd.map((data, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />)}
    <section className="overflow-hidden border-b border-forest/10 bg-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-10 sm:py-14 md:grid-cols-[1.3fr_0.7fr]">
        <div className="relative z-10">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-forest">The Fresh Stop catalogue</p>
          <h1 className="max-w-3xl font-display text-4xl font-black leading-[1.05] tracking-tight text-forest sm:text-6xl">{activeLabel ?? <>Fresh finds.<br /><span className="text-brand-red">Everyday favourites.</span></>}</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/75">{activeCategory ? `${categoryDescription(activeCategory)} Find something you like? Ask our team for details.` : "Explore fresh produce, pantry staples and groceries. Find something you like? Our team is here for product, wholesale and delivery enquiries."}</p>
          <a href="/catalogues/fresh-stop-range.txt" download className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest underline underline-offset-4">Download the range guide<ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
        {categoryImage
          ? <div className="relative mx-auto hidden aspect-[4/3] w-full max-w-sm overflow-hidden rounded-[3rem] bg-white md:block"><Image src={categoryImage.imageUrl} alt={categoryImage.imageAlt || categoryImage.name} fill priority sizes="(min-width: 768px) 35vw, 0px" className="object-cover" /></div>
          : <div className="hidden justify-center md:flex"><Mascot kind="strawberry" animation="bounce" size={140} /></div>}
      </div>
    </section>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <form action="/products" method="GET" role="search" className="mb-6 flex max-w-2xl gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        <div className="cat-search relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-forest" aria-hidden="true" /><label htmlFor="catalogue-search" className="sr-only">Search the product catalogue</label><input id="catalogue-search" type="search" name="q" defaultValue={q} maxLength={150} placeholder="Find fruit, rice, spices and more…" className="min-h-12 w-full rounded-full border border-forest/20 bg-white py-3 pl-12 pr-4 text-sm focus-visible:outline-2 focus-visible:outline-forest" /></div>
        <button className="min-h-12 rounded-full bg-forest px-5 text-sm font-bold text-white transition-colors hover:bg-forest-deep">Search</button>
      </form>
      <ProductFilters categories={categories} categorySlug={category} searchQuery={q} />
      <div className="relative mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <PeekingCarrot />
        <h2 className="font-display text-2xl font-extrabold text-forest">{q ? `Results for “${q}”` : activeLabel || "Explore the catalogue"}</h2>
        <p className="text-sm text-ink/75">{products.length} {products.length === 1 ? "product" : "products"}{(q || category) && <> · <Link href="/products" className="font-bold text-forest underline underline-offset-4">Clear filters</Link></>}</p>
      </div>
      <div key={gridKey} className="results-swap">
        {products.length
          ? <ProductGrid>{products.map((product, index) => <ProductCard key={product.id} {...product} categoryName={product.category.name} categorySlug={product.category.slug} priority={index < 4} index={index} headingLevel="h3" />)}</ProductGrid>
          : <EmptySearch q={q} categoryLabel={activeLabel} />}
      </div>
      {(hasAi || !products.length) && <p className="mt-6 text-xs leading-relaxed text-ink/75">AI-generated product images are illustrative. Packaging and appearance may vary. Please contact our team to confirm product details and current availability.</p>}
      <section className="mt-14 rounded-[2rem] bg-forest px-6 py-8 text-white sm:p-10">
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Wholesale &amp; Business Orders</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85">For wholesale orders, bulk purchases and business enquiries, please call or email our team.</p>
        <div className="mt-6"><ContactCards kind="wholesale" /></div>
      </section>
    </div>
  </>;
}
