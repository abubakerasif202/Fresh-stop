import { db } from "./db";
import { MIN_ORDER_AMOUNT, FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE } from "@/types/cart";

export interface DeliveryCheckResult {
  eligible: boolean;
  zoneName?: string;
  primaryBranchSlug?: string;
  deliveryFee: number;
  deliveryFeeCents: number;
  freeDeliveryThreshold: number;
  minOrderAmount: number;
  message: string;
}

export async function checkDelivery(postcode: string, subtotalDollars = 0): Promise<DeliveryCheckResult> {
  const cleanPostcode = postcode.trim();
  if (!cleanPostcode || !/^\d{4}$/.test(cleanPostcode)) {
    return {
      eligible: false,
      deliveryFee: STANDARD_DELIVERY_FEE,
      deliveryFeeCents: Math.round(STANDARD_DELIVERY_FEE * 100),
      freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
      minOrderAmount: MIN_ORDER_AMOUNT,
      message: "Please enter a valid 4-digit Australian postcode."
    };
  }

  // Fetch all active delivery zones from database
  let zones: {
    id: string;
    name: string;
    postcodes: string;
    deliveryFee: number;
    freeDeliveryMinSpend: number;
    minOrderAmount: number;
    primaryBranchSlug: string;
    isActive: boolean;
  }[] = [];

  try {
    zones = await db.deliveryZone.findMany({ where: { isActive: true } });
  } catch {
    // If DB read fails during fallback, use baseline zones
    zones = [
      {
        id: "zone-1",
        name: "St George & Bayside",
        postcodes: "2216,2217,2218,2220,2205,2207,2219,2221",
        deliveryFee: 9.99,
        freeDeliveryMinSpend: 150.0,
        minOrderAmount: 50.0,
        primaryBranchSlug: "rockdale",
        isActive: true
      },
      {
        id: "zone-2",
        name: "Canterbury-Bankstown & Georges River",
        postcodes: "2210,2209,2211,2212,2196,2213,2208,2214",
        deliveryFee: 9.99,
        freeDeliveryMinSpend: 150.0,
        minOrderAmount: 50.0,
        primaryBranchSlug: "riverwood",
        isActive: true
      }
    ];
  }

  // Find matching zone
  const matchedZone = zones.find((z) => {
    const list = z.postcodes.split(",").map((p) => p.trim());
    return list.includes(cleanPostcode);
  });

  if (!matchedZone) {
    return {
      eligible: false,
      deliveryFee: STANDARD_DELIVERY_FEE,
      deliveryFeeCents: Math.round(STANDARD_DELIVERY_FEE * 100),
      freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
      minOrderAmount: MIN_ORDER_AMOUNT,
      message: `Postcode ${cleanPostcode} is outside our current local fresh delivery zones. Contact our team for wholesale or regional enquiries.`
    };
  }

  const isFree = subtotalDollars >= matchedZone.freeDeliveryMinSpend;
  const deliveryFee = isFree ? 0 : matchedZone.deliveryFee;
  const deliveryFeeCents = Math.round(deliveryFee * 100);

  return {
    eligible: true,
    zoneName: matchedZone.name,
    primaryBranchSlug: matchedZone.primaryBranchSlug,
    deliveryFee,
    deliveryFeeCents,
    freeDeliveryThreshold: matchedZone.freeDeliveryMinSpend,
    minOrderAmount: matchedZone.minOrderAmount,
    message: isFree
      ? `Delivery to ${cleanPostcode} (${matchedZone.name}) is FREE!`
      : `Delivery to ${cleanPostcode} (${matchedZone.name}) is $${deliveryFee.toFixed(2)} AUD.`
  };
}
