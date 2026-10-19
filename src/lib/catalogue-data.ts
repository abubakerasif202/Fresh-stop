import { db } from "./db";
import { imageKind, formatUnitPrice, type ImageKind } from "./product-commerce";
import baseline from "@/data/catalogue-baseline.json";
import { catalogueCandidates, catalogueCategories } from "@/data/catalogue-candidates";
import sydneyPricing from "@/data/sydney-pricing-dataset.json";

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

const pricingMap = new Map(sydneyPricing.map((item) => [item.slug, item]));

/**
 * Clean public projection for catalogue products. Exposes approved selling prices,
 * unit pricing, and purchasable status while filtering out sensitive cost and admin fields.
 */
export function publicCatalogueProduct(
  product: PublicProductInput,
  source: CatalogueProduct["source"] = "database"
): CatalogueProduct {
  const original = baseline.products.find((p) => p.slug === product.slug);
  const name = original?.name === product.name ? displayNames[product.slug] ?? product.name : product.name;
  const description = product.description ?? (original?.description === product.description ? `Fresh ${name.toLocaleLowerCase("en-AU")} from Fresh Stop.` : null);

  const priceRef = pricingMap.get(product.slug);

  // Determine approved price and cents
  let price: number | null = null;
  let priceCents: number | null = null;

  if (typeof product.price === "number" && Number.isFinite(product.price) && product.price > 0) {
    price = product.price;
    priceCents = product.priceCents ?? Math.round(price * 100);
  } else if (typeof product.priceCents === "number" && product.priceCents > 0) {
    priceCents = product.priceCents;
    price = Number((priceCents / 100).toFixed(2));
  } else if (priceRef && priceRef.approvalStatus === "APPROVED" && priceRef.approvedSellingPrice) {
    price = priceRef.approvedSellingPrice;
    priceCents = priceRef.priceCents ?? Math.round(price * 100);
  }

  const unit = product.unit ?? priceRef?.unit ?? null;
  const packageQuantity = product.packageQuantity ?? priceRef?.packageQuantity ?? 1.0;
  const compareAtPrice = product.compareAtPrice ?? priceRef?.sydneyMarketRefPrice ?? null;
  const taxCategory = (product.taxCategory as "GST_FREE" | "TAXABLE_10") || (priceRef?.taxCategory as "GST_FREE" | "TAXABLE_10") || "GST_FREE";
  const approvalStatus = (product.approvalStatus as "APPROVED" | "PENDING" | "REJECTED") || (priceRef?.approvalStatus as "APPROVED" | "PENDING" | "REJECTED") || (price ? "APPROVED" : "PENDING");
  const isPurchasable = product.isPurchasable !== undefined ? product.isPurchasable : (approvalStatus === "APPROVED" && price !== null);
  const availabilityStatus = product.availabilityStatus ?? priceRef?.availabilityStatus ?? "IN_STOCK";

  const unitPriceDisplay = priceRef?.unitPriceDisplay || formatUnitPrice(price, unit, packageQuantity);

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
    priceCents,
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
