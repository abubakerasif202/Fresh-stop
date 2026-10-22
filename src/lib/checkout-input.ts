/** Explicit validation of the untrusted checkout request body. No client price is ever read. */

import type { ClientCartItemInput } from "./order-pricing";

export const MAX_BODY_BYTES = 32 * 1024;
export const MAX_REQUEST_LINES = 50;
/** Absolute ceiling accepted by the validator; per-product limits are enforced in pricing. */
const MAX_REQUEST_QUANTITY = 1000;

export type Fulfilment = "DELIVERY" | "PICKUP";

export interface CheckoutCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
  suburb: string;
  postcode: string;
  notes: string;
  preferredDeliveryDate: string | null;
}

export interface CheckoutInput {
  backorderAcknowledged?: boolean;
  items: ClientCartItemInput[];
  customer: CheckoutCustomer;
  fulfillmentType: Fulfilment;
  idempotencyKey: string | null;
  pickupBranchSlug: string | null;
}

export type CheckoutInputResult =
  | { ok: true; value: CheckoutInput }
  | { ok: false; errors: Record<string, string> };

const EMAIL = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()"]{2,}$/;
const AU_PHONE = /^(?:\+?61|0)[2-478]\d{8}$/;
const POSTCODE = /^\d{4}$/;
const KEY = /^[A-Za-z0-9_-]{8,64}$/;
const IDENTIFIER = /^[A-Za-z0-9_-]{1,100}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Control characters other than tab, line feed and carriage return are never valid in free text. */
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127) return true;
  }
  return false;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function text(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max * 2 || hasControlChars(value)) return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

function parseItems(raw: unknown, errors: Record<string, string>): ClientCartItemInput[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.items = "Your shopping basket is empty.";
    return [];
  }
  if (raw.length > MAX_REQUEST_LINES) {
    errors.items = "Too many different items in one order.";
    return [];
  }
  const items: ClientCartItemInput[] = [];
  raw.forEach((entry, index) => {
    if (!isRecord(entry)) {
      errors[`items.${index}`] = "Invalid item.";
      return;
    }
    const id = typeof entry.productId === "string" ? entry.productId.trim() : "";
    const slug = typeof entry.slug === "string" ? entry.slug.trim() : "";
    if (!(id ? IDENTIFIER.test(id) : slug ? IDENTIFIER.test(slug) : false)) errors[`items.${index}`] = "Each item needs a valid product.";
    const quantity = entry.quantity;
    if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_REQUEST_QUANTITY) {
      errors[`items.${index}.quantity`] = "Quantity must be a whole number of 1 or more.";
    }
    const expected = entry.expectedPriceCents;
    // Only the product reference and quantity are taken; any client price field is dropped.
    items.push({
      ...(id ? { productId: id } : { slug }),
      quantity: quantity as number,
      ...(typeof expected === "number" && Number.isSafeInteger(expected) ? { expectedPriceCents: expected } : {})
    });
  });
  return items;
}

function normalisePhone(raw: string): string {
  return raw.replace(/[\s()-]/g, "");
}

function isRealDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function parseCustomer(raw: unknown, fulfilment: Fulfilment, errors: Record<string, string>): CheckoutCustomer {
  const c = isRecord(raw) ? raw : {};
  if (!isRecord(raw)) errors.customer = "Customer details are required.";
  const name = text(c.name, 100);
  const email = text(c.email, 254);
  const phoneRaw = text(c.phone, 30);
  const address = text(c.address, 200);
  const suburb = text(c.suburb, 80);
  const postcode = text(c.postcode, 4);
  const notes = text(c.notes, 500);
  const date = text(c.preferredDeliveryDate, 10);
  if (name === null || name.length < 2) errors.name = "Please enter your full name.";
  if (email === null || !EMAIL.test(email)) errors.email = "Please enter a valid email address.";
  const phone = phoneRaw === null ? "" : normalisePhone(phoneRaw);
  if (!AU_PHONE.test(phone)) errors.phone = "Please enter a valid Australian phone number.";
  if (notes === null) errors.notes = "Notes must be 500 characters or fewer.";
  if (date === null || (date !== "" && !isRealDate(date))) errors.preferredDeliveryDate = "Use the format YYYY-MM-DD.";
  if (address === null || suburb === null) errors.address = "Address details are too long or invalid.";
  if (fulfilment === "DELIVERY") {
    if (!address || address.length < 3) errors.address = "Please enter your delivery street address.";
    if (!suburb || suburb.length < 2) errors.suburb = "Please enter your suburb.";
    if (!postcode || !POSTCODE.test(postcode)) errors.postcode = "Please enter a valid 4-digit postcode.";
  }
  return {
    name: name ?? "",
    email: (email ?? "").toLowerCase(),
    phone,
    address: address ?? "",
    suburb: suburb ?? "",
    postcode: postcode ?? "",
    notes: notes ?? "",
    preferredDeliveryDate: date ? date : null
  };
}

export function validateCheckoutBody(body: unknown): CheckoutInputResult {
  const errors: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: { body: "Invalid request." } };
  const fulfilment = body.fulfillmentType;
  if (fulfilment !== "DELIVERY" && fulfilment !== "PICKUP") errors.fulfillmentType = "Choose delivery or pickup.";
  const fulfillmentType: Fulfilment = fulfilment === "PICKUP" ? "PICKUP" : "DELIVERY";
  const items = parseItems(body.items, errors);
  const customer = parseCustomer(body.customer, fulfillmentType, errors);
  const key = body.idempotencyKey;
  if (typeof key !== "string" || !KEY.test(key)) {
    errors.idempotencyKey = "Invalid idempotency key.";
  }
  const branch = body.pickupBranchSlug;
  if (fulfillmentType === "PICKUP" && (typeof branch !== "string" || !IDENTIFIER.test(branch))) {
    errors.pickupBranchSlug = "Choose a pickup store.";
  }
  if (branch !== undefined && branch !== null && (typeof branch !== "string" || !IDENTIFIER.test(branch))) {
    errors.pickupBranchSlug = "Invalid pickup branch.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      backorderAcknowledged: body.backorderAcknowledged === true,
      items,
      customer,
      fulfillmentType,
      idempotencyKey: typeof key === "string" ? key : null,
      pickupBranchSlug: typeof branch === "string" ? branch : null
    }
  };
}
