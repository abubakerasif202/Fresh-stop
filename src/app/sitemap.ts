import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({ select: { slug: true, updatedAt: true } });
  return [
    ...["/", "/products", "/stores"].map((path) => ({ url: new URL(path, SITE_URL).href })),
    ...products.map((product) => ({
      url: new URL(`/products/${encodeURIComponent(product.slug)}`, SITE_URL).href,
      lastModified: product.updatedAt
    }))
  ];
}
