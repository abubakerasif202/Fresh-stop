import type { MetadataRoute } from "next";
import { getCatalogue } from "@/lib/catalogue-data";
import { SITE_URL } from "@/lib/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getCatalogue();
  return [...["/", "/products", "/stores", "/wholesale", "/home-delivery"].map(path => ({url:new URL(path,SITE_URL).href})),...products.map(p=>({url:new URL(`/products/${encodeURIComponent(p.slug)}`,SITE_URL).href}))];
}
