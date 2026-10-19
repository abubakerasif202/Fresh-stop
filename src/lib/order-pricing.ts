import { db } from "./db";
import { MIN_ORDER_AMOUNT } from "@/types/cart";
import { checkDelivery } from "./delivery";

export interface ClientCartItemInput {
  productId?: string;
  slug?: string;
  quantity: number;
}

export interface VerifiedOrderItem {
  productId: string;
  slug: string;
  name: string;
  unit: string;
  imageUrl: string;
  priceCents: number;
  priceDollars: number;
  quantity: number;
  totalCents: number;
  totalDollars: number;
  taxCategory: "GST_FREE" | "TAXABLE_10";
  taxCents: number;
  taxDollars: number;
}

export interface ValidatedOrderResult {
  ok: true;
  items: VerifiedOrderItem[];
  subtotalCents: number;
  subtotalDollars: number;
  gstTotalCents: number;
  gstTotalDollars: number;
  deliveryFeeCents: number;
  deliveryFeeDollars: number;
  totalCents: number;
  totalDollars: number;
  primaryBranchSlug?: string;
  zoneName?: string;
}

export interface ValidationErrorResult {
  ok: false;
  status: number;
  error: string;
  details?: Record<string, string>;
}

export async function validateAndPriceOrder(
  rawItems: ClientCartItemInput[],
  deliveryPostcode?: string,
  fulfillmentType = "DELIVERY"
): Promise<ValidatedOrderResult | ValidationErrorResult> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false, status: 400, error: "Your shopping basket is empty." };
  }

  // Deduplicate and aggregate input quantities
  const itemMap = new Map<string, number>();
  for (const item of rawItems) {
    const key = (item.productId || item.slug || "").trim();
    if (!key) continue;
    const qty = Math.floor(Number(item.quantity));
    if (isNaN(qty) || qty <= 0) {
      return { ok: false, status: 400, error: `Invalid quantity for item ${key}.` };
    }
    itemMap.set(key, (itemMap.get(key) || 0) + qty);
  }

  if (itemMap.size === 0) {
    return { ok: false, status: 400, error: "No valid items in cart." };
  }

  const identifiers = Array.from(itemMap.keys());

  // Fetch from database, falling back to verified pricing dataset if DB is unreachable or unconfigured
  let products: Array<{
    id: string;
    slug: string;
    name: string;
    imageUrl: string;
    price: number | null;
    priceCents: number | null;
    unit: string | null;
    isPurchasable: boolean;
    approvalStatus: string;
    taxCategory: string;
    availabilityStatus: string;
    stockQuantity?: number | null;
  }> = [];

  try {
    if (process.env.DATABASE_URL) {
      products = await db.product.findMany({
        where: {
          OR: [
            { id: { in: identifiers } },
            { slug: { in: identifiers } }
          ],
          isPublished: true
        },
        select: {
          id: true,
          slug: true,
          name: true,
          imageUrl: true,
          price: true,
          priceCents: true,
          unit: true,
          isPurchasable: true,
          approvalStatus: true,
          taxCategory: true,
          availabilityStatus: true,
          stockQuantity: true
        }
      });
    } else {
      throw new Error("DATABASE_URL not configured");
    }
  } catch {
    // Fallback to verified pricing dataset
    const dataset = (await import("@/data/sydney-pricing-dataset.json", { with: { type: "json" } })).default;
    products = (dataset as Array<{
      productId: string;
      slug: string;
      name: string;
      approvedSellingPrice: number | null;
      priceCents: number | null;
      unit: string | null;
      approvalStatus: string;
      taxCategory: string;
      availabilityStatus: string;
    }>)
      .filter((item) => identifiers.includes(item.productId) || identifiers.includes(item.slug))
      .map((item) => ({
        id: item.productId,
        slug: item.slug,
        name: item.name,
        imageUrl: `/products/${item.slug}.webp`,
        price: item.approvedSellingPrice,
        priceCents: item.priceCents ?? (item.approvedSellingPrice ? Math.round(item.approvedSellingPrice * 100) : null),
        unit: item.unit,
        isPurchasable: item.approvalStatus === "APPROVED",
        approvalStatus: item.approvalStatus,
        taxCategory: item.taxCategory,
        availabilityStatus: item.availabilityStatus,
        stockQuantity: 99
      }));
  }

  const verifiedItems: VerifiedOrderItem[] = [];
  let subtotalCents = 0;
  let gstTotalCents = 0;

  for (const [key, qty] of itemMap.entries()) {
    const product = products.find((p) => p.id === key || p.slug === key);
    if (!product) {
      return {
        ok: false,
        status: 400,
        error: `Product '${key}' is no longer available in the catalogue.`
      };
    }

    if (!product.isPurchasable || product.approvalStatus !== "APPROVED") {
      return {
        ok: false,
        status: 400,
        error: `'${product.name}' requires price enquiry and cannot be purchased online.`
      };
    }

    if (product.availabilityStatus === "OUT_OF_STOCK") {
      return {
        ok: false,
        status: 400,
        error: `'${product.name}' is currently out of stock.`
      };
    }

    // Determine validated price in cents
    const priceCents =
      typeof product.priceCents === "number" && product.priceCents > 0
        ? product.priceCents
        : product.price
        ? Math.round(product.price * 100)
        : 0;

    if (priceCents <= 0) {
      return {
        ok: false,
        status: 400,
        error: `'${product.name}' does not have an approved selling price.`
      };
    }

    const boundedQty = Math.min(qty, 99);
    const lineTotalCents = priceCents * boundedQty;
    const taxCat = (product.taxCategory as "GST_FREE" | "TAXABLE_10") || "GST_FREE";

    // Australian GST is 1/11th of total retail price for taxable items
    const lineGstCents = taxCat === "TAXABLE_10" ? Math.round(lineTotalCents / 11) : 0;

    subtotalCents += lineTotalCents;
    gstTotalCents += lineGstCents;

    verifiedItems.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unit: product.unit || "each",
      imageUrl: product.imageUrl,
      priceCents,
      priceDollars: Number((priceCents / 100).toFixed(2)),
      quantity: boundedQty,
      totalCents: lineTotalCents,
      totalDollars: Number((lineTotalCents / 100).toFixed(2)),
      taxCategory: taxCat,
      taxCents: lineGstCstSafe(lineGstCents),
      taxDollars: Number((lineGstCents / 100).toFixed(2))
    });
  }

  const subtotalDollars = Number((subtotalCents / 100).toFixed(2));

  // Check minimum spend
  if (subtotalDollars < MIN_ORDER_AMOUNT) {
    return {
      ok: false,
      status: 400,
      error: `Minimum order amount is $${MIN_ORDER_AMOUNT.toFixed(2)} AUD. Your cart subtotal is $${subtotalDollars.toFixed(2)} AUD.`
    };
  }

  let deliveryFeeCents = 0;
  let primaryBranchSlug = "rockdale";
  let zoneName = "Sydney Hub";

  if (fulfillmentType === "DELIVERY") {
    if (!deliveryPostcode) {
      return { ok: false, status: 400, error: "A delivery postcode is required for delivery orders." };
    }
    const deliveryCheck = await checkDelivery(deliveryPostcode, subtotalDollars);
    if (!deliveryCheck.eligible) {
      return { ok: false, status: 400, error: deliveryCheck.message };
    }
    deliveryFeeCents = deliveryCheck.deliveryFeeCents;
    primaryBranchSlug = deliveryCheck.primaryBranchSlug || "rockdale";
    zoneName = deliveryCheck.zoneName || "Sydney Metro";
  }

  const deliveryFeeDollars = Number((deliveryFeeCents / 100).toFixed(2));
  const totalCents = subtotalCents + deliveryFeeCents;
  const totalDollars = Number((totalCents / 100).toFixed(2));
  const gstTotalDollars = Number((gstTotalCents / 100).toFixed(2));

  return {
    ok: true,
    items: verifiedItems,
    subtotalCents,
    subtotalDollars,
    gstTotalCents,
    gstTotalDollars,
    deliveryFeeCents,
    deliveryFeeDollars,
    totalCents,
    totalDollars,
    primaryBranchSlug,
    zoneName
  };
}

function lineGstCstSafe(val: number): number {
  return isNaN(val) ? 0 : val;
}
