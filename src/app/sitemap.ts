import type { MetadataRoute } from "next";
import { getCatalogue } from "@/lib/catalogue-data";
import { SITE_URL } from "@/lib/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getCatalogue();
  const categories = [...new Map(products.map(product => [product.category.slug, product.category])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
  return [...["/", "/products", "/stores", "/wholesale", "/home-delivery", "/about", "/contact", "/faq"].map(path => ({url:new URL(path,SITE_URL).href})),...categories.map(c=>({url:new URL(`/products?category=${encodeURIComponent(c.slug)}`,SITE_URL).href})),...products.map(p=>({url:new URL(`/products/${encodeURIComponent(p.slug)}`,SITE_URL).href}))];
}
