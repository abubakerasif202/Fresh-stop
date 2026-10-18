import type { MetadataRoute } from "next";
import { getCatalogue, getCategories } from "@/lib/catalogue-data";
import { SITE_URL } from "@/lib/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getCatalogue(), getCategories()]);
  return [...["/", "/products", "/stores", "/wholesale", "/home-delivery", "/about", "/contact", "/faq"].map(path => ({url:new URL(path,SITE_URL).href})),...categories.map(c=>({url:new URL(`/products?category=${encodeURIComponent(c.slug)}`,SITE_URL).href})),...products.map(p=>({url:new URL(`/products/${encodeURIComponent(p.slug)}`,SITE_URL).href}))];
}
