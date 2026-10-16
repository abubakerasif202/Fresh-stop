import type { Metadata } from "next";
import { catalogueCategories } from "@/data/catalogue-candidates";
import { categoryLabel } from "./category-order";

/** Metadata and JSON-LD for the enquiry-only catalogue. Nothing here may carry prices or offers. */
export interface SeoCategory { name: string; slug: string }
export interface SeoProduct { slug: string; name: string; imageUrl: string; description?: string | null; category?: SeoCategory }

export function categoryDescription(category: SeoCategory): string {
  const known = catalogueCategories.find(c => c.slug === category.slug)?.description;
  return known ?? `Browse ${categoryLabel(category).toLowerCase()} in the Fresh Stop catalogue.`;
}

export function buildProductsMetadata(category?: SeoCategory, q?: string): Metadata {
  const canonical = category ? `/products?category=${encodeURIComponent(category.slug)}` : "/products";
  const base = category
    ? {
        title: `${categoryLabel(category)} catalogue`,
        description: `${categoryDescription(category)} Browse ${categoryLabel(category).toLowerCase()} at Fresh Stop and enquire with our team for details.`
      }
    : {
        title: "Product Catalogue",
        description: "Explore Fresh Stop's fresh produce, groceries, frozen foods, drinks and pantry essentials. Contact our team for product and wholesale enquiries."
      };
  return { ...base, alternates: { canonical }, ...(q ? { robots: { index: false, follow: true } } : {}) };
}

const absolute = (baseUrl: string, path: string) => (/^https?:/.test(path) ? path : `${baseUrl.replace(/\/$/, "")}${path}`);

export function buildItemListJsonLd(baseUrl: string, name: string, products: readonly SeoProduct[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absolute(baseUrl, `/products/${encodeURIComponent(p.slug)}`),
      name: p.name
    }))
  };
}

export function buildBreadcrumbJsonLd(baseUrl: string, trail: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: absolute(baseUrl, t.path) }))
  };
}

/** Product schema without offers/price: Fresh Stop does not publish prices or availability. */
export function buildProductJsonLd(baseUrl: string, product: SeoProduct) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: absolute(baseUrl, product.imageUrl),
    url: absolute(baseUrl, `/products/${encodeURIComponent(product.slug)}`),
    ...(product.description ? { description: product.description } : {}),
    ...(product.category ? { category: product.category.name } : {})
  };
}

/** Safe for <script type="application/ld+json">: escapes characters that could close the tag. */
export function jsonLdString(data: unknown): string {
  const hex = (code: number) => `\\u${code.toString(16).padStart(4, "0")}`;
  return [...JSON.stringify(data)].map(c => ("<".includes(c) || c.charCodeAt(0) === 0x2028 || c.charCodeAt(0) === 0x2029 ? hex(c.charCodeAt(0)) : c)).join("");
}
