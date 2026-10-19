import { db } from "./db";
import { imageKind, formatUnitPrice, isApprovedPrice, resolveCompareAtPrice, type ImageKind } from "./product-commerce";
import baseline from "@/data/catalogue-baseline.json";
import { catalogueCandidates, catalogueCategories } from "@/data/catalogue-candidates";

export interface CatalogueCategory {
  id: string;
  name: string;
  slug: string;
}

export interface CatalogueProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string;
  imageAlt: string | null;
  category: CatalogueCategory;
  imageKind: ImageKind;
  source: "database" | "asset-review";
  price: number | null;
  priceCents: number | null;
  compareAtPrice: number | null;
  unit: string | null;
  unitPriceDisplay: string | null;
  packageQuantity: number;
  taxCategory: "GST_FREE" | "TAXABLE_10";
  isPurchasable: boolean;
  approvalStatus: "APPROVED" | "PENDING" | "REJECTED";
  availabilityStatus: string;
}

export interface CatalogueStore {
  id: string;
  name: string;
  slug: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  phone: string;
  email: string;
  googleMapsUrl: string;
  openingHours: string;
}

export type PublicProductInput = Partial<CatalogueProduct> & {
  priceApprovedBy?: string | null;
  compareAtApproved?: boolean | null;
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string;
  imageAlt: string | null;
  category: CatalogueCategory;
};

const displayNames: Record<string, string> = {
  "artisanal-sourdough-loaf": "Sourdough bread",
  "blueberries-125g": "Blueberries",
  "farm-full-cream-milk-2l": "Full cream milk",
  "free-range-eggs-dozen": "Eggs",
  "fresh-broccoli-head": "Broccoli"
};

/**
 * Clean public projection for catalogue products. Exposes only admin-approved selling prices; anything else
 * (suggested, bundled snapshot, unapproved) is enquiry-only. Cost, market and admin fields are never exposed.
 */
export function publicCatalogueProduct(
  product: PublicProductInput,
  source: CatalogueProduct["source"] = "database"
): CatalogueProduct {
  const original = baseline.products.find((p) => p.slug === product.slug);
  const name = original?.name === product.name ? displayNames[product.slug] ?? product.name : product.name;
  const description = product.description ?? (original?.description === product.description ? `Fresh ${name.toLocaleLowerCase("en-AU")} from Fresh Stop.` : null);

  // Fail closed: a price is public only when a named admin approved it. Bundled/suggested numbers never reach here.
  const priceCents = product.priceCents ?? (typeof product.price === "number" && product.price > 0 ? Math.round(product.price * 100) : null);
  const approved = source === "database" && isApprovedPrice({ approvalStatus: product.approvalStatus, priceApprovedBy: product.priceApprovedBy, priceCents });
  const publicCents = approved ? priceCents : null;
  const price = publicCents === null ? null : Number((publicCents / 100).toFixed(2));
  const unit = product.unit ?? null;
  const packageQuantity = product.packageQuantity ?? 1.0;
  const compareAtPrice = resolveCompareAtPrice({ price, compareAtPrice: product.compareAtPrice, compareAtApproved: product.compareAtApproved });
  const taxCategory = product.taxCategory === "TAXABLE_10" ? "TAXABLE_10" : "GST_FREE";
  const approvalStatus = approved ? "APPROVED" : product.approvalStatus === "REJECTED" ? "REJECTED" : "PENDING";
  const isPurchasable = approved && product.isPurchasable === true;
  const availabilityStatus = product.availabilityStatus ?? "UNKNOWN";
  const unitPriceDisplay = price === null ? null : formatUnitPrice(price, unit, packageQuantity);

  return {
    id: product.id,
    slug: product.slug,
    name,
    description,
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    category: { id: product.category.id, name: product.category.name, slug: product.category.slug },
    imageKind: imageKind(product.imageUrl),
    source,
    price,
    priceCents: publicCents,
    compareAtPrice,
    unit,
    unitPriceDisplay,
    packageQuantity,
    taxCategory,
    isPurchasable,
    approvalStatus,
    availabilityStatus
  };
}

export function usesReviewedSnapshot() {
  const mode = process.env.CATALOGUE_DATA_SOURCE;
  if (mode === "reviewed-snapshot") {
    if (process.env.VERCEL_ENV === "production") throw new Error("Reviewed catalogue snapshots cannot be published to production.");
    return true;
  }
  if (mode && mode !== "database") throw new Error("Unsupported CATALOGUE_DATA_SOURCE. Use database or reviewed-snapshot.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required. For the reviewed catalogue Preview, explicitly set CATALOGUE_DATA_SOURCE=reviewed-snapshot.");
  return false;
}

export function filterCatalogue(products: CatalogueProduct[], filters: { category?: string; q?: string; limit?: number } = {}) {
  const q = filters.q?.trim().toLocaleLowerCase("en-AU");
  return products
    .filter((p) => (!filters.category || p.category.slug === filters.category) && (!q || `${p.name} ${p.category.name}`.toLocaleLowerCase("en-AU").includes(q)))
    .sort((a, b) => Number(a.imageKind === "placeholder") - Number(b.imageKind === "placeholder") || a.name.localeCompare(b.name, "en-AU"))
    .slice(0, filters.limit ?? 1000);
}

export async function getCatalogue(filters: { category?: string; q?: string; limit?: number } = {}): Promise<CatalogueProduct[]> {
  if (usesReviewedSnapshot()) {
    const products = new Map<string, CatalogueProduct>();
    for (const b of baseline.products) {
      products.set(b.slug, publicCatalogueProduct(b as unknown as PublicProductInput, "database"));
    }
    for (const p of catalogueCandidates) {
      if (products.has(p.slug)) continue;
      const category = catalogueCategories.find((c) => c.slug === p.categorySlug);
      if (!category) throw new Error(`Missing reviewed category for ${p.slug}`);
      products.set(
        p.slug,
        publicCatalogueProduct(
          {
            ...p,
            id: `staged-${p.slug}`,
            category: { id: `staged-${category.slug}`, name: category.name, slug: category.slug },
            imageKind: p.imageKind === "ai-illustration" ? "ai" : "placeholder"
          },
          "asset-review"
        )
      );
    }
    return filterCatalogue([...products.values()], filters);
  }

  const products = await db.product.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      imageUrl: true,
      imageAlt: true,
      price: true,
      priceCents: true,
      priceApprovedBy: true,
      compareAtApproved: true,
      compareAtPrice: true,
      unit: true,
      packageQuantity: true,
      unitPriceCents: true,
      taxCategory: true,
      isPurchasable: true,
      approvalStatus: true,
      availabilityStatus: true,
      category: { select: { id: true, name: true, slug: true } }
    },
    orderBy: { name: "asc" }
  });

  return filterCatalogue(
    products.map((p) => publicCatalogueProduct(p as unknown as PublicProductInput)),
    filters
  );
}

export async function getProduct(slug: string) {
  return (await getCatalogue()).find((p) => p.slug === slug) ?? null;
}

export async function getCategories(): Promise<CatalogueCategory[]> {
  const products = await getCatalogue();
  return [...new Map(products.map((p) => [p.category.slug, p.category])).values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en-AU")
  );
}

export async function getStores(): Promise<CatalogueStore[]> {
  if (usesReviewedSnapshot()) return baseline.stores;
  return db.storeBranch.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      suburb: true,
      state: true,
      postcode: true,
      phone: true,
      email: true,
      googleMapsUrl: true,
      openingHours: true
    }
  });
}

export const getCatalogueProducts = (filters: { category?: string; search?: string } = {}) =>
  getCatalogue({ category: filters.category, q: filters.search });
export const getCatalogueProduct = getProduct;
export const getCatalogueCategories = getCategories;
