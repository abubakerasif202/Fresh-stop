import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CheckCircle2, ShieldCheck, Truck } from "lucide-react";
import { getProduct, getCatalogue } from "@/lib/catalogue-data";
import { SITE_URL } from "@/lib/site";
import { CategoryChip } from "@/components/products/CategoryChip";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductGrid } from "@/components/products/ProductGrid";
import { categoryLabel } from "@/components/products/category-order";
import { buildBreadcrumbJsonLd, buildProductJsonLd, jsonLdString } from "@/components/products/catalogue-seo";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { resolveCompareAtPrice } from "@/lib/product-commerce";
import "@/styles/catalogue-motion.css";

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  return {
    title: `${product.name} — Fresh Stop Sydney`,
    description: `Buy ${product.name} online from Fresh Stop. Australian fresh produce and grocery delivery across Sydney, NSW.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} | Fresh Stop Sydney`,
      description: `Buy ${product.name} online from Fresh Stop.`,
      images: [{ url: product.imageUrl, alt: product.imageAlt || product.name }]
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const related = (await getCatalogue({ category: product.category.slug }))
    .filter((item) => item.id !== product.id)
    .slice(0, 4);
  const label = categoryLabel(product.category);
  const categoryHref = `/products?category=${encodeURIComponent(product.category.slug)}`;

  const jsonLd = [
    buildBreadcrumbJsonLd(SITE_URL, [
      { name: "Home", path: "/" },
      { name: "Catalogue", path: "/products" },
      { name: label, path: categoryHref },
      { name: product.name, path: `/products/${encodeURIComponent(product.slug)}` }
    ]),
    buildProductJsonLd(SITE_URL, product)
  ];

  // Presented as buyable only when the server marks the product purchasable (approved price, verified stock).
  const canBuy = product.isPurchasable && typeof product.price === "number" && product.price > 0 && typeof product.priceCents === "number" && product.priceCents > 0;
  const wasPrice = canBuy ? resolveCompareAtPrice({ price: product.price, compareAtPrice: product.compareAtPrice, compareAtApproved: product.compareAtPrice !== null }) : null;
  const isGstFree = product.taxCategory === "GST_FREE";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      {jsonLd.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(data) }}
        />
      ))}
      <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-xs font-semibold sm:text-sm">
        <Link href="/products" className="text-forest hover:underline">
          Catalogue
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={categoryHref} className="text-forest hover:underline">
          {label}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-ink-soft">
          {product.name}
        </span>
      </nav>

      <div className="grid items-start gap-8 md:grid-cols-2 lg:gap-16">
        <figure>
          <div className="soft-pop relative aspect-square overflow-hidden rounded-[2rem] border border-forest/10 bg-cream">
            <Image
              src={product.imageUrl}
              alt={product.imageAlt || product.name}
              fill
              priority
              sizes="(max-width: 767px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          {product.imageKind === "ai" && (
            <figcaption className="mt-3 text-xs leading-relaxed text-ink-soft">
              AI-generated illustrative product image. Actual produce appearance may vary by season.
            </figcaption>
          )}
          {product.imageKind === "placeholder" && (
            <figcaption className="mt-3 text-xs text-ink-soft">Product photograph coming soon.</figcaption>
          )}
        </figure>

        <div className="py-2 lg:py-6">
          <CategoryChip href={categoryHref} name={label} slug={product.category.slug} />
          <h1 className="mt-3 font-display text-4xl font-black leading-tight tracking-tight text-forest sm:text-5xl">
            {product.name}
          </h1>

          {/* Pricing Section */}
          <div className="mt-5 rounded-2xl border border-forest/15 bg-white p-5 shadow-soft sm:p-6">
            {canBuy && product.price !== null ? (
              <div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-display text-3xl font-black text-forest sm:text-4xl">${product.price.toFixed(2)} AUD</span>
                  {product.unit && <span className="text-sm font-bold text-ink-soft">/ {product.unit}</span>}
                  {wasPrice !== null && <span className="text-sm text-ink-soft line-through">Was ${wasPrice.toFixed(2)}</span>}
                </div>
                {product.unitPriceDisplay && <p className="mt-1 text-xs font-bold text-deep-green">Unit price: {product.unitPriceDisplay}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-forest/10 pt-3 text-xs text-ink-soft">
                  <span className="inline-flex items-center gap-1.5 font-bold text-deep-green">
                    <CheckCircle2 size={16} aria-hidden="true" /> Available to order online
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <ShieldCheck size={16} className="text-forest" aria-hidden="true" />
                    {isGstFree ? "GST-free grocery item" : "Includes 10% GST"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Truck size={16} className="text-forest" aria-hidden="true" />
                    Delivery options and fees confirmed at checkout
                  </span>
                </div>
                <div className="mt-6">
                  <AddToCartButton
                    productId={product.id}
                    slug={product.slug}
                    name={product.name}
                    priceCents={product.priceCents}
                    unit={product.unit}
                    imageUrl={product.imageUrl}
                    imageAlt={product.imageAlt}
                    isPurchasable
                    large
                  />
                </div>
              </div>
            ) : (
              <div>
                <p className="text-lg font-bold text-forest">Price and availability on enquiry</p>
                <p className="mt-1 text-xs text-ink-soft">This product is not available to order online yet. Contact our team for current price and availability.</p>
                <div className="mt-4">
                  <AddToCartButton
                    productId={product.id}
                    slug={product.slug}
                    name={product.name}
                    priceCents={null}
                    unit={product.unit}
                    imageUrl={product.imageUrl}
                    imageAlt={product.imageAlt}
                    large
                  />
                </div>
              </div>
            )}
          </div>

          {product.description && (
            <div className="mt-6">
              <h2 className="font-display text-sm font-black uppercase tracking-wider text-forest/70">Description</h2>
              <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-ink/80">{product.description}</p>
            </div>
          )}

          <div className="my-7 h-px bg-forest/15" />

          {/* Wholesale Box */}
          <div className="rounded-2xl bg-leaf/10 p-5">
            <h2 className="font-display font-extrabold text-forest">Wholesale &amp; business orders</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">
              Cafés, restaurants, caterers and grocers can order in commercial bulk crates with custom billing.
            </p>
            <Link
              href="/wholesale"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-forest underline underline-offset-4"
            >
              Wholesale enquiry &amp; delivery info
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-3xl font-extrabold text-forest">More in {label}</h2>
          <ProductGrid>
            {related.map((item, index) => (
              <ProductCard
                key={item.id}
                {...item}
                categoryName={item.category.name}
                categorySlug={item.category.slug}
                index={index}
              />
            ))}
          </ProductGrid>
        </section>
      )}
    </div>
  );
}
