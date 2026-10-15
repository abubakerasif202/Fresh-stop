import { SITE_URL } from "@/lib/site";
import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cataloguePrice } from "@/lib/catalogue";
import { ProductPurchase } from "@/components/products/ProductPurchase";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ShoppingMemory } from "@/components/products/ShoppingMemory";

export const revalidate = 60;
const getProduct = cache((slug: string) => db.product.findUnique({ where: { slug }, include: { category: true, inventory: { include: { storeBranch: true } } } }));
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Product not found" };
  return { title: product.name, description: product.description || `Shop ${product.name}, priced per ${product.unit}, at Fresh Stop.`, alternates: { canonical: `/products/${product.slug}` }, openGraph: { title: product.name, images: [{ url: product.imageUrl, alt: product.name }] } };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const related = await db.product.findMany({ where: { categoryId: product.categoryId, id: { not: product.id } }, include: { category: true, inventory: { where: { isAvailable: true, storeBranch: { isActive: true } }, select: { storeBranch: { select: { slug: true } } } } }, take: 5, orderBy: { name: "asc" } });
  const price = cataloguePrice(product);
  const availableBranches = product.inventory.filter((i) => i.isAvailable && i.storeBranch.isActive).map((i) => i.storeBranch.slug);
  const url = new URL(`/products/${product.slug}`, SITE_URL).href;
  const structuredData = { "@context": "https://schema.org", "@type": "Product", name: product.name, image: product.imageUrl, description: product.description || undefined, sku: product.id, category: product.category.name, offers: { "@type": "Offer", url, price: price.toFixed(2), priceCurrency: "AUD", availability: `https://schema.org/${availableBranches.length ? "InStock" : "OutOfStock"}` } };
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-2 text-sm text-forest"><Link href="/products">Shop</Link><span aria-hidden="true">/</span><Link href={`/products?category=${encodeURIComponent(product.category.slug)}`}>{product.category.name}</Link><span aria-hidden="true">/</span><span className="text-ink">{product.name}</span></nav>
    <div className="grid items-center gap-8 md:grid-cols-2 lg:gap-16">
      <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-leaf/10"><Image src={product.imageUrl} alt={product.name} fill priority sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" /></div>
      <div>
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-forest">{product.category.name}</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{product.name}</h1>
        <p className="mt-5 font-display text-3xl font-bold">${price.toFixed(2)} <span className="font-sans text-base font-normal text-ink/70">/ {product.unit}</span></p>
        {price < product.price && <p className="mt-2 text-sm font-semibold text-forest">Special price · Save ${(product.price - price).toFixed(2)} per {product.unit}</p>}
        {product.description && <p className="mt-6 text-base leading-relaxed text-ink/80">{product.description}</p>}
        <ProductPurchase product={{ id: product.id, slug: product.slug, name: product.name, price, unit: product.unit, imageUrl: product.imageUrl }} availableBranches={availableBranches} />
        <div className="mt-5 rounded-2xl bg-leaf/10 p-5 text-sm leading-relaxed">Choose Click &amp; Collect or check your postcode for delivery at checkout. Availability and prices are verified when you place your order.</div>
      </div>
    </div>
    {related.length > 0 && <section className="mt-16"><h2 className="mb-6 font-display text-3xl font-bold">More from {product.category.name.toLowerCase()}</h2><ProductGrid>{related.map((p) => <ProductCard key={p.id} {...p} categoryName={p.category.name} categorySlug={p.category.slug}
                    availableBranches={p.inventory.map((i) => i.storeBranch.slug)} />)}</ProductGrid></section>}
    <ShoppingMemory viewed={{ slug: product.slug, name: product.name }} />
  </div>;
}
