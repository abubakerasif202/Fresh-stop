import { SITE_URL } from "@/lib/site";
import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cataloguePrice } from "@/lib/catalogue";
import { AI_IMAGE_DISCLOSURE, ENQUIRE_LABEL, PRICE_IN_STORE_LABEL, imageKind, isSellableOnline } from "@/lib/product-commerce";
import { EnquireLink } from "@/components/products/EnquireLink";
import { CategoryChip } from "@/components/products/CategoryChip";
import { Phone } from "lucide-react";
import { ProductPurchase } from "@/components/products/ProductPurchase";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ShoppingMemory } from "@/components/products/ShoppingMemory";

export const revalidate = 60;
const getProduct = cache((slug: string) => db.product.findUnique({ where: { slug }, include: { category: true, inventory: { include: { storeBranch: true } } } }));
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product || !product.isPublished) return { title: "Product not found" };
  const priced = cataloguePrice(product) !== null && Boolean(product.unit);
  const fallback = priced
    ? `Shop ${product.name}, priced per ${product.unit}, at Fresh Stop.`
    : `${product.name} at Fresh Stop in Rockdale and Riverwood. Price available in store, so contact your nearest store to enquire.`;
  return { title: product.name, description: product.description || fallback, alternates: { canonical: `/products/${product.slug}` }, openGraph: { title: product.name, images: [{ url: product.imageUrl, alt: product.name }] } };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product || !product.isPublished) notFound();
  const branches = await db.storeBranch.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { slug: true, name: true, phone: true } });
  const related = await db.product.findMany({ where: { isPublished: true, categoryId: product.categoryId, id: { not: product.id } }, include: { category: true, inventory: { where: { isAvailable: true, storeBranch: { isActive: true } }, select: { storeBranch: { select: { slug: true } } } } }, take: 5, orderBy: { name: "asc" } });
  const price = cataloguePrice(product);
  const sellable = isSellableOnline(product) && price !== null;
  const availableBranches = product.inventory.filter((i) => i.isAvailable && i.storeBranch.isActive).map((i) => i.storeBranch.slug);
  const url = new URL(`/products/${product.slug}`, SITE_URL).href;
  const kind = imageKind(product.imageUrl);
  const alt = product.imageAlt || (kind === "placeholder" ? `${product.name} (photo coming soon)` : product.name);
  // Product/Offer markup only when a real, confirmed price exists.
  const structuredData = sellable
    ? { "@context": "https://schema.org", "@type": "Product", name: product.name, image: product.imageUrl, description: product.description || undefined, sku: product.id, category: product.category.name, offers: { "@type": "Offer", url, price: price.toFixed(2), priceCurrency: "AUD", availability: `https://schema.org/${availableBranches.length ? "InStock" : "OutOfStock"}` } }
    : null;
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
    {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\u003c") }} />}
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-2 text-sm text-forest"><Link href="/products">Shop</Link><span aria-hidden="true">/</span><Link href={`/products?category=${encodeURIComponent(product.category.slug)}`}>{product.category.name}</Link><span aria-hidden="true">/</span><span aria-current="page" className="text-ink">{product.name}</span></nav>
    <div className="grid items-start gap-8 md:grid-cols-2 lg:gap-16">
      <figure>
        <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-cream shadow-soft ring-1 ring-ink/5"><Image src={product.imageUrl} alt={alt} fill priority sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" /></div>
        {kind === "ai" && <figcaption className="mt-3 text-xs text-ink/70">{AI_IMAGE_DISCLOSURE}</figcaption>}
        {kind === "placeholder" && <figcaption className="mt-3 text-xs text-ink/70">Product photo coming soon.</figcaption>}
      </figure>
      <div>
        <div><CategoryChip href={`/products?category=${encodeURIComponent(product.category.slug)}`} name={product.category.name} slug={product.category.slug} /></div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{product.name}</h1>
        {price !== null && product.unit ? <>
          <p className="mt-5 font-display text-3xl font-bold">${price.toFixed(2)} <span className="font-sans text-base font-normal text-ink/70">/ {product.unit}</span></p>
          {product.price !== null && price < product.price && <p className="mt-2 text-sm font-semibold text-forest">Special price · Save ${(product.price - price).toFixed(2)} per {product.unit}</p>}
        </> : <p className="mt-5"><span className="inline-flex items-center gap-2 rounded-full bg-sun/30 px-4 py-2 font-display text-lg font-bold ring-1 ring-sun/60"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-citrus" />{PRICE_IN_STORE_LABEL}</span></p>}
        {product.description && <p className="mt-6 text-base leading-relaxed text-ink/80">{product.description}</p>}
        {sellable
          ? <ProductPurchase product={{ id: product.id, slug: product.slug, name: product.name, price, unit: product.unit as string, imageUrl: product.imageUrl }} availableBranches={availableBranches} />
          : <div className="mt-6 space-y-5">
              <p className="text-sm leading-relaxed text-ink/80">We haven&apos;t published an online price for this item, so it can&apos;t be ordered online yet. Contact your nearest store to ask about today&apos;s price and availability.</p>
              <EnquireLink name={product.name} large />
              <ul className="space-y-2 text-sm">
                {branches.map((b) => <li key={b.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-white p-3 ring-1 ring-ink/10">
                  <Link href={`/stores#${b.slug}`} className="font-semibold text-forest underline underline-offset-4">{b.name}</Link>
                  <a href={`tel:${b.phone.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-1.5 font-semibold" aria-label={`${ENQUIRE_LABEL}: call ${b.name} on ${b.phone}`}><Phone className="h-4 w-4" aria-hidden="true" />{b.phone}</a>
                </li>)}
              </ul>
            </div>}
        {sellable && <div className="mt-5 rounded-2xl bg-leaf/10 p-5 text-sm leading-relaxed">Choose Click &amp; Collect or check your postcode for delivery at checkout. Availability and prices are verified when you place your order.</div>}
      </div>
    </div>
    {related.length > 0 && <section className="mt-16"><h2 className="mb-6 font-display text-3xl font-bold">More from {product.category.name.toLowerCase()}</h2><ProductGrid>{related.map((p) => <ProductCard key={p.id} {...p} categoryName={p.category.name} categorySlug={p.category.slug}
                    availableBranches={p.inventory.map((i) => i.storeBranch.slug)} />)}</ProductGrid></section>}
    <ShoppingMemory viewed={{ slug: product.slug, name: product.name }} />
  </div>;
}
