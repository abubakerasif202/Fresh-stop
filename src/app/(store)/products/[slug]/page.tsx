import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MessageCircle, ArrowUpRight } from "lucide-react";
import { getProduct, getCatalogue } from "@/lib/catalogue-data";
import { productEnquiryHref, productWhatsAppHref } from "@/lib/contact";
import { CategoryChip } from "@/components/products/CategoryChip";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductGrid } from "@/components/products/ProductGrid";

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Product not found" };
  return { title: product.name, description: `Explore ${product.name} in the Fresh Stop catalogue. Contact our team for product details, availability and wholesale enquiries.`, alternates: { canonical: `/products/${product.slug}` }, openGraph: { title: product.name, images: [{ url: product.imageUrl, alt: product.imageAlt || product.name }] } };
}
export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const related = (await getCatalogue({ category: product.category.slug })).filter(item => item.id !== product.id).slice(0, 4);
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
    <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-xs font-semibold sm:text-sm"><Link href="/products" className="text-forest hover:underline">Catalogue</Link><span aria-hidden="true">/</span><Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="text-forest hover:underline">{product.category.name}</Link><span aria-hidden="true">/</span><span aria-current="page" className="text-ink/65">{product.name}</span></nav>
    <div className="grid items-start gap-8 md:grid-cols-2 lg:gap-16">
      <figure><div className="relative aspect-square overflow-hidden rounded-[2rem] border border-forest/10 bg-cream"><Image src={product.imageUrl} alt={product.imageAlt || product.name} fill priority sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" /></div>{product.imageKind === "ai" && <figcaption className="mt-3 text-xs leading-relaxed text-ink/65">AI-generated illustrative product image. Actual product appearance may vary.</figcaption>}{product.imageKind === "placeholder" && <figcaption className="mt-3 text-xs text-ink/65">Product photograph coming soon.</figcaption>}</figure>
      <div className="py-2 lg:py-6"><CategoryChip href={`/products?category=${encodeURIComponent(product.category.slug)}`} name={product.category.name} slug={product.category.slug} /><h1 className="mt-3 font-display text-4xl font-black leading-tight tracking-tight text-forest sm:text-5xl">{product.name}</h1><p className="mt-5 text-lg font-bold text-forest">Enquire for details</p>{product.description && <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-ink/75">{product.description}</p>}<div className="my-7 h-px bg-forest/15" /><h2 className="font-display text-xl font-extrabold text-forest">Let’s talk fresh.</h2><p className="mt-3 text-sm leading-relaxed text-ink/70">Ask our team about this product, current availability or bulk enquiries. Please confirm packaging and product details directly with us.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><a href={productEnquiryHref(product.name)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 font-bold text-white hover:bg-forest-deep"><Mail className="h-4 w-4" aria-hidden="true" />Email an enquiry</a><a href={productWhatsAppHref(product.name)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-forest px-6 font-bold text-forest hover:bg-leaf/10"><MessageCircle className="h-4 w-4" aria-hidden="true" />WhatsApp<span className="sr-only"> (opens in a new tab)</span><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a></div><p className="mt-6 text-sm text-ink/65">Prefer to visit? <Link href="/stores" className="font-bold text-forest underline underline-offset-4">Find our stores</Link></p><div className="mt-8 rounded-2xl bg-leaf/10 p-5"><h2 className="font-display font-extrabold text-forest">Wholesale &amp; business enquiries</h2><p className="mt-2 text-sm leading-relaxed text-ink/75">For wholesale orders, bulk purchases and business enquiries, please call or email our team.</p><Link href="/wholesale" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-forest underline underline-offset-4">Wholesale information<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div></div>
    </div>
    {related.length > 0 && <section className="mt-16"><h2 className="mb-6 font-display text-3xl font-extrabold text-forest">More to explore</h2><ProductGrid>{related.map(item => <ProductCard key={item.id} {...item} categoryName={item.category.name} categorySlug={item.category.slug} />)}</ProductGrid></section>}
  </div>;
}
