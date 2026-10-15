import { signOrderToken } from "./order-token";
import type { Order } from "@prisma/client";
import { parseRequestedItems, type ContactFields, type RequestedItem } from "./checkout-pricing";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function checkoutOrderId(key: string | null): string | null {
  if (!key || !UUID.test(key)) return null;
  const signature = signOrderToken(`checkout-idempotency:${key.toLowerCase()}`);
  return signature ? `checkout_${signature}` : null;
}

export interface CheckoutRequestInput extends ContactFields {
  fulfillmentType: "PICKUP" | "DELIVERY";
  branchSlug: string;
  paymentMethod: string;
  items: RequestedItem[];
}

type ReplayOrder = Pick<Order, "customerName" | "customerEmail" | "customerPhone" |
  "deliveryAddress" | "deliveryPostcode" | "deliveryNotes" | "pickupTimeslot" |
  "fulfillmentType" | "paymentMethod" | "itemsJson"> & { storeBranch: { slug: string } };

/** Replay the original request even after prices, stock, slots or order status change. */
export function sameCheckoutRequest(existing: ReplayOrder, proposed: CheckoutRequestInput): boolean {
  if (existing.fulfillmentType !== proposed.fulfillmentType || existing.paymentMethod !== proposed.paymentMethod ||
      existing.customerName !== proposed.customerName || existing.customerEmail !== proposed.customerEmail ||
      existing.customerPhone !== proposed.customerPhone || (existing.deliveryNotes ?? "") !== proposed.deliveryNotes) return false;
  if (proposed.fulfillmentType === "PICKUP") {
    if (existing.storeBranch.slug !== proposed.branchSlug || existing.pickupTimeslot !== proposed.pickupTimeslot) return false;
  } else if (existing.deliveryAddress !== proposed.deliveryAddress || existing.deliveryPostcode !== proposed.deliveryPostcode) return false;
  try {
    const savedItems = parseRequestedItems(JSON.parse(existing.itemsJson));
    if (!savedItems.ok || savedItems.items.length !== proposed.items.length) return false;
    const quantities = new Map(savedItems.items.map((item) => [item.id, item.quantity]));
    return proposed.items.every((item) => quantities.get(item.id) === item.quantity);
  } catch {
    return false;
  }
}
