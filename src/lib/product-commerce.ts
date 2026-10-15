/** Single source of truth for whether a product can be shown, priced and bought online. */

export const PRICE_IN_STORE_LABEL = "Price available in store";
export const ENQUIRE_LABEL = "Enquire at Store";
export const MAX_PRODUCT_PRICE = 10000;

export interface CommerceFields {
  price: number | null;
  unit: string | null;
  isPublished?: boolean;
  isSpecial?: boolean;
  specialPrice?: number | null;
}

const isPositive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

/** True only when a real, confirmed base price exists. */
export function hasConfirmedPrice(p: Pick<CommerceFields, "price">): boolean {
  return isPositive(p.price);
}

/** Effective unit price, or null when the product has no confirmed price. */
export function effectivePrice(p: Pick<CommerceFields, "price" | "isSpecial" | "specialPrice">): number | null {
  if (!isPositive(p.price)) return null;
  return p.isSpecial && isPositive(p.specialPrice) ? p.specialPrice : p.price;
}

/** Product may enter a basket / order: published, confirmed price and a selling unit. */
export function isSellableOnline(p: CommerceFields): boolean {
  return p.isPublished !== false && isPositive(p.price) && typeof p.unit === "string" && p.unit.trim().length > 0;
}

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
 * publishing is its own explicit flag and is gated on every commerce field.
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

  if (isPublished && price !== null) {
    // A priced, published product is purchasable: demand a unit and at least one available branch.
    if (!unit) errors.unit = "A selling unit is required before a priced product can be published.";
    if (!branchAvailability || !Object.values(branchAvailability).some(Boolean)) {
      errors.branchAvailability = "Mark the product available at one or more branches before publishing a priced product.";
    }
  }
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
