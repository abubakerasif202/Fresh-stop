import type { PrismaClient } from "@prisma/client";
import { db } from "./db";

/**
 * Delivery rules come ONLY from admin-approved DeliveryZone rows (isApproved with
 * integer-cent fees). There are no bundled defaults: no approved zone means the
 * postcode is not eligible. A null freeDeliveryMinCents / minOrderCents means the
 * business has not configured that rule, so it is simply not applied.
 */

/** DeliverySetting key for an optional, admin-approved minimum order for pickup. */
export const PICKUP_MIN_ORDER_SETTING_KEY = "pickupMinOrderCents";

export type DeliveryClient = Pick<PrismaClient, "deliveryZone" | "deliverySetting">;

export type DeliveryRejectCode = "INVALID_POSTCODE" | "NO_APPROVED_ZONE" | "BELOW_MIN_ORDER" | "DB_UNAVAILABLE";

export interface DeliveryEligible {
  eligible: true;
  zoneName: string;
  primaryBranchSlug: string;
  /** Fee actually charged for this subtotal (0 when the free-delivery threshold is met). */
  deliveryFeeCents: number;
  /** Approved standard fee for the zone. */
  zoneFeeCents: number;
  freeDeliveryMinCents: number | null;
  minOrderCents: number | null;
  message: string;
}

export interface DeliveryRejected {
  eligible: false;
  code: DeliveryRejectCode;
  message: string;
  minOrderCents?: number;
}

export type DeliveryCheckResult = DeliveryEligible | DeliveryRejected;

const POSTCODE_PATTERN = /^\d{4}$/;

const reject = (code: DeliveryRejectCode, message: string, extra: Partial<DeliveryRejected> = {}): DeliveryRejected => ({
  eligible: false,
  code,
  message,
  ...extra
});

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function parsePostcodes(raw: string): string[] {
  return raw.split(",").map((p) => p.trim()).filter(Boolean);
}

export async function checkDelivery(
  postcode: string,
  subtotalCents = 0,
  client: DeliveryClient = db
): Promise<DeliveryCheckResult> {
  const clean = typeof postcode === "string" ? postcode.trim() : "";
  if (!POSTCODE_PATTERN.test(clean)) {
    return reject("INVALID_POSTCODE", "Please enter a valid 4-digit Australian postcode.");
  }

  let zones;
  try {
    zones = await client.deliveryZone.findMany({
      where: { isActive: true, isApproved: true, deliveryFeeCents: { not: null } },
      orderBy: { name: "asc" }
    });
  } catch {
    return reject("DB_UNAVAILABLE", "Delivery options are temporarily unavailable. Please try again shortly.");
  }

  const zone = zones.find((z) => parsePostcodes(z.postcodes).includes(clean));
  if (!zone || zone.deliveryFeeCents === null) {
    return reject("NO_APPROVED_ZONE", `We do not have confirmed online delivery for ${clean} yet. Please contact us to enquire.`);
  }

  const minOrderCents = zone.minOrderCents;
  if (minOrderCents !== null && subtotalCents < minOrderCents) {
    return reject(
      "BELOW_MIN_ORDER",
      `The minimum order for delivery to ${clean} is ${formatCents(minOrderCents)} AUD.`,
      { minOrderCents }
    );
  }

  const free = zone.freeDeliveryMinCents !== null && subtotalCents >= zone.freeDeliveryMinCents;
  const deliveryFeeCents = free ? 0 : zone.deliveryFeeCents;
  return {
    eligible: true,
    zoneName: zone.name,
    primaryBranchSlug: zone.primaryBranchSlug,
    deliveryFeeCents,
    zoneFeeCents: zone.deliveryFeeCents,
    freeDeliveryMinCents: zone.freeDeliveryMinCents,
    minOrderCents,
    message: free
      ? `Delivery to ${clean} (${zone.name}) is free.`
      : `Delivery to ${clean} (${zone.name}) is ${formatCents(deliveryFeeCents)} AUD.`
  };
}

/**
 * Pickup minimum order, only if the business has approved one. Returns null when
 * no (valid) setting exists. Throws on database errors so callers fail closed.
 */
export async function getPickupMinOrderCents(client: Pick<PrismaClient, "deliverySetting"> = db): Promise<number | null> {
  const row = await client.deliverySetting.findUnique({ where: { key: PICKUP_MIN_ORDER_SETTING_KEY } });
  if (!row || !/^\d{1,9}$/.test(row.value.trim())) return null;
  return Number(row.value.trim());
}
