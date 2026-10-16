import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { getCatalogue, getCategories } from "@/lib/catalogue-data";
import { CONTACT } from "@/lib/contact";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductGrid } from "@/components/products/ProductGrid";

export const metadata: Metadata = { title: "Product Catalogue", description: "Explore Fresh Stop's fresh produce, groceries, frozen foods, drinks and pantry essentials. Contact our team for product and wholesale enquiries.", alternates: { canonical: "/products" } };
export const revalidate = 60;
type Props = { searchParams: Promise<{ category?: string | string[]; q?: string | string[] }> };

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 150) || "";
  const category = (Array.isArray(params.category) ? params.category[0] : params.category)?.trim().slice(0, 100) || undefined;
  const [products, categories] = await Promise.all([getCatalogue({ category, q }), getCategories()]);
  const activeCategory = categories.find(categoryItem => categoryItem.slug === category);
  const categoryImage = products.find(product => product.imageKind !== "placeholder");
  return <>
    <section className="overflow-hidden border-b border-forest/10 bg-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-10 sm:py-14 md:grid-cols-[1.3fr_0.7fr]">
        <div className="relative z-10">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-forest">The Fresh Stop catalogue</p>
          <h1 className="max-w-3xl font-display text-4xl font-black leading-[1.05] tracking-tight text-forest sm:text-6xl">{activeCategory ? activeCategory.name : <>Fresh finds.<br /><span className="text-brand-red">Everyday favourites.</span></>}</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/75">Explore fresh produce, pantry staples and groceries. Find something you like? Our team is here for product, wholesale and delivery enquiries.</p>
          <a href="/catalogues/fresh-stop-range.txt" download className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest underline underline-offset-4">Download the range guide<ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
        {categoryImage && <div className="relative mx-auto hidden aspect-[4/3] w-full max-w-sm overflow-hidden rounded-[3rem] bg-white md:block"><Image src={categoryImage.imageUrl} alt={categoryImage.imageAlt || categoryImage.name} fill priority sizes="(min-width: 768px) 35vw, 0px" className="object-cover" /></div>}
      </div>
    </section>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <form action="/products" method="GET" role="search" className="mb-6 flex max-w-2xl gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-forest" aria-hidden="true" /><label htmlFor="catalogue-search" className="sr-only">Search the product catalogue</label><input id="catalogue-search" type="search" name="q" defaultValue={q} maxLength={150} placeholder="Find fruit, rice, spices and more…" className="min-h-12 w-full rounded-full border border-forest/20 bg-white py-3 pl-12 pr-4 text-sm focus-visible:outline-2 focus-visible:outline-forest" /></div>
        <button className="min-h-12 rounded-full bg-forest px-5 text-sm font-bold text-white hover:bg-forest-deep">Search</button>
      </form>
      <ProductFilters categories={categories} categorySlug={category} searchQuery={q} />
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3"><h2 className="font-display text-2xl font-extrabold text-forest">{q ? `Results for “${q}”` : activeCategory?.name || "Explore the catalogue"}</h2><p className="text-sm text-ink/75">{products.length} {products.length === 1 ? "product" : "products"}{(q || category) && <> · <Link href="/products" className="font-bold text-forest underline underline-offset-4">Clear filters</Link></>}</p></div>
      {products.length ? <ProductGrid>{products.map((product, index) => <ProductCard key={product.id} {...product} categoryName={product.category.name} categorySlug={product.category.slug} priority={index < 4} index={index} headingLevel="h3" />)}</ProductGrid> : <div className="rounded-3xl border border-forest/10 bg-white px-6 py-16 text-center"><h3 className="font-display text-2xl font-extrabold text-forest">No products found</h3><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/70">Try another search or category. You can also contact our team about the product you are looking for.</p><Link href="/products" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-forest px-6 font-bold text-white">View all products</Link></div>}
      <p className="mt-6 text-xs leading-relaxed text-ink/75">AI-generated product images are illustrative. Packaging and appearance may vary. Please contact our team to confirm product details and current availability.</p>
      <section className="mt-14 rounded-[2rem] bg-forest px-6 py-8 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-10"><div><h2 className="font-display text-2xl font-extrabold sm:text-3xl">Wholesale &amp; Business Orders</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85">For wholesale orders, bulk purchases and business enquiries, please call or email our team.</p></div><div className="mt-6 flex shrink-0 flex-wrap gap-3 sm:mt-0"><a href={CONTACT.phoneHref} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-bold text-forest">Call Now <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a><a href={CONTACT.wholesaleEmailHref} className="inline-flex min-h-12 items-center rounded-full border border-white/50 px-6 font-bold">Email Us</a></div></section>
    </div>
  </>;
}
