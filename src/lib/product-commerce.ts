/** Admin catalogue input validation and public image provenance helpers. */

export const PRICE_IN_STORE_LABEL = "Enquire for details";
export const ENQUIRE_LABEL = "Enquire for details";
export const MAX_PRODUCT_PRICE = 10000;

export const SELLING_UNITS = ["kg", "each", "bunch", "head", "punnet", "pack", "bag", "box", "bottle", "loaf"] as const;

export interface ProductInput {
  name?: unknown;
  categoryId?: unknown;
  description?: unknown;
  imageUrl?: unknown;
  imageAlt?: unknown;
  price?: unknown;
  unit?: unknown;
  isPublished?: unknown;
  branchAvailability?: unknown;
}

export interface ValidProduct {
  name: string;
  categoryId: string;
  description: string | null;
  imageUrl: string;
  imageAlt: string | null;
  price: number | null;
  unit: string | null;
  isPublished: boolean;
  branchAvailability: Record<string, boolean> | null;
}

const IMAGE_PATH = /^\/products\/(ai\/)?[a-z0-9][a-z0-9-]{0,80}\.(webp|jpg|jpeg|png)$/;
const UNIT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .×-]{0,29}$/;
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/**
 * Validate an admin product payload. Entering a price never publishes a product:
 * publishing is its own explicit flag. Branch inventory is not a catalogue publishing requirement.
 */
export function validateProductInput(
  input: ProductInput,
  knownBranchSlugs: readonly string[]
): { ok: true; value: ValidProduct } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = text(input.name);
  if (name.length < 2 || name.length > 120) errors.name = "Name must be 2–120 characters.";
  const categoryId = text(input.categoryId);
  if (!categoryId || categoryId.length > 64) errors.categoryId = "Choose a category.";
  const description = text(input.description);
  if (description.length > 1000) errors.description = "Description must be 1000 characters or fewer.";
  const imageUrl = text(input.imageUrl);
  if (!IMAGE_PATH.test(imageUrl)) errors.imageUrl = "Choose an image from the product image library.";
  const imageAlt = text(input.imageAlt);
  if (imageAlt.length > 160) errors.imageAlt = "Alt text must be 160 characters or fewer.";

  let price: number | null = null;
  if (input.price !== null && input.price !== undefined && input.price !== "") {
    const n = typeof input.price === "string" ? Number(input.price) : input.price;
    if (typeof n !== "number" || !Number.isFinite(n) || n <= 0 || n > MAX_PRODUCT_PRICE || Math.abs(Math.round(n * 100) - n * 100) > 1e-6) {
      errors.price = `Price must be greater than $0 and at most $${MAX_PRODUCT_PRICE}, in whole cents. Leave blank for “${PRICE_IN_STORE_LABEL}”.`;
    } else price = Number(n.toFixed(2));
  }

  let unit: string | null = null;
  const rawUnit = text(input.unit);
  if (rawUnit) {
    if (!UNIT_PATTERN.test(rawUnit)) errors.unit = "Unit contains unsupported characters.";
    else unit = rawUnit;
  }

  let branchAvailability: Record<string, boolean> | null = null;
  if (input.branchAvailability !== undefined) {
    const raw = input.branchAvailability;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) errors.branchAvailability = "Branch availability must be an object.";
    else {
      branchAvailability = {};
      for (const [slug, v] of Object.entries(raw as Record<string, unknown>)) {
        if (!knownBranchSlugs.includes(slug) || typeof v !== "boolean") { errors.branchAvailability = "Unknown branch or non-boolean availability."; break; }
        branchAvailability[slug] = v;
      }
    }
  }

  if (input.isPublished !== undefined && typeof input.isPublished !== "boolean") errors.isPublished = "isPublished must be true or false.";
  const isPublished = input.isPublished === true;

  if (price !== null && !unit) errors.unit = errors.unit ?? "Select a selling unit when entering a price.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, categoryId, description: description || null, imageUrl, imageAlt: imageAlt || null, price, unit, isPublished, branchAvailability } };
}

export const PLACEHOLDER_IMAGE = "/products/placeholder-produce.webp";

export type ImageKind = "ai" | "placeholder" | "photo";

/** AI-generated assets live under /products/ai/; they are illustrative and must be disclosed as such. */
export function imageKind(url: string): ImageKind {
  if (url === PLACEHOLDER_IMAGE) return "placeholder";
  return url.startsWith("/products/ai/") ? "ai" : "photo";
}

export const AI_IMAGE_DISCLOSURE = "Illustrative AI-generated image, not a photograph of actual in-store stock.";

export function formatAud(dollars: number | null | undefined): string {
  if (dollars === null || dollars === undefined || isNaN(dollars)) return "";
  return `$${dollars.toFixed(2)}`;
}

export function formatCentsAud(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || isNaN(cents)) return "";
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatUnitPrice(price: number | null, unit: string | null, packageQuantity = 1.0): string | null {
  if (price === null || price === undefined || !unit) return null;
  const p = Number(price);
  if (unit === "kg" || unit === "1kg pack" || unit === "1kg bag") return `$${p.toFixed(2)}/kg`;
  if (unit === "2kg bag") return `$${(p / 2).toFixed(2)}/kg`;
  if (unit === "2L bottle") return `$${(p / 2).toFixed(2)}/L`;
  if (unit === "1L bottle") return `$${p.toFixed(2)}/L`;
  if (unit.includes("g punnet") || unit.includes("g pack") || unit.includes("g bag") || unit.includes("g tub") || unit.includes("g jar")) {
    const grams = parseFloat(unit);
    if (!isNaN(grams) && grams > 0) {
      const per100g = (p / (grams / 100)).toFixed(2);
      return `$${per100g}/100g`;
    }
  }
  if (packageQuantity > 1 && (unit === "pack" || unit === "box")) {
    return `$${(p / packageQuantity).toFixed(2)}/item`;
  }
  return `$${p.toFixed(2)} / ${unit}`;
}

export function isGstFree(taxCategory: string | null | undefined): boolean {
  return taxCategory !== "TAXABLE_10";
}

export interface ApprovalFields {
  approvalStatus?: string | null;
  priceApprovedBy?: string | null;
  priceCents?: number | null;
}

/** A price may be shown publicly only when a named admin approved it and it is a positive integer number of cents. */
export function isApprovedPrice(p: ApprovalFields): boolean {
  return p.approvalStatus === "APPROVED" && typeof p.priceApprovedBy === "string" && p.priceApprovedBy.trim() !== "" && Number.isInteger(p.priceCents) && (p.priceCents ?? 0) > 0;
}

/**
 * A "was"/compare-at price is shown only when an admin explicitly approved it (compareAtApproved) and it is
 * higher than the selling price. Market or competitor benchmarks are never promoted to compare-at prices.
 */
export function resolveCompareAtPrice(input: { price: number | null; compareAtPrice?: number | null; compareAtApproved?: boolean | null }): number | null {
  const { price, compareAtPrice, compareAtApproved } = input;
  if (compareAtApproved !== true || price === null) return null;
  return typeof compareAtPrice === "number" && Number.isFinite(compareAtPrice) && compareAtPrice > price ? compareAtPrice : null;
}
