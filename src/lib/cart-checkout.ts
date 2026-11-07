import type { CartLine } from "./cart-core";

export type Fulfillment = "DELIVERY" | "PICKUP";

export interface CheckoutForm {
  backorderAcknowledged: boolean;
  fulfillmentType: Fulfillment;
  branch: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  suburb: string;
  postcode: string;
  notes: string;
  preferredDate: string;
}

export type FormErrors = Partial<Record<keyof CheckoutForm, string>>;

export const PICKUP_BRANCHES = [
  { slug: "rockdale", label: "Fresh Stop Rockdale", postcode: "2216" },
  { slug: "riverwood", label: "Fresh Stop Riverwood", postcode: "2210" }
] as const;

export const EMPTY_FORM: CheckoutForm = {
  backorderAcknowledged: false,
  fulfillmentType: "DELIVERY",
  branch: "rockdale",
  name: "",
  email: "",
  phone: "",
  address: "",
  suburb: "",
  postcode: "",
  notes: "",
  preferredDate: ""
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Australian landline/mobile: 0X XXXX XXXX or +61 X XXXX XXXX once spaces and punctuation are removed.
const AU_PHONE = /^(?:\+?61|0)[2-478]\d{8}$/;

export function validateCheckoutForm(form: CheckoutForm): FormErrors {
  const errors: FormErrors = {};
  if (form.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!EMAIL.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (!AU_PHONE.test(form.phone.replace(/[\s()-]/g, ""))) errors.phone = "Enter a valid Australian phone number, e.g. 0412 345 678.";
  if (form.fulfillmentType === "DELIVERY") {
    if (form.address.trim().length < 5) errors.address = "Enter your street address.";
    if (form.suburb.trim().length < 2) errors.suburb = "Enter your suburb.";
    if (!/^\d{4}$/.test(form.postcode.trim())) errors.postcode = "Enter a 4-digit postcode.";
  } else if (!PICKUP_BRANCHES.some((b) => b.slug === form.branch)) {
    errors.branch = "Choose a pickup store.";
  }
  if (form.preferredDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.preferredDate)) errors.preferredDate = "Enter a valid date.";
  return errors;
}

/** Prices are deliberately absent: the server prices every line from its own catalogue. */
export function buildCheckoutPayload(lines: readonly CartLine[], form: CheckoutForm, idempotencyKey: string) {
  const branch = PICKUP_BRANCHES.find((b) => b.slug === form.branch) ?? PICKUP_BRANCHES[0];
  const pickup = form.fulfillmentType === "PICKUP";
  return {
    // expectedPriceCents is only a staleness guard: the server prices from its own catalogue and answers 409 PRICE_CHANGED on mismatch.
    items: lines.map((l) => ({ productId: l.productId, slug: l.slug, quantity: l.quantity, expectedPriceCents: l.priceCents })),
    customer: {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: pickup ? `Click & Collect (${branch.label})` : form.address.trim(),
      suburb: pickup ? branch.slug : form.suburb.trim(),
      state: "NSW",
      postcode: pickup ? branch.postcode : form.postcode.trim(),
      notes: form.notes.trim(),
      preferredDeliveryDate: form.preferredDate
    },
    fulfillmentType: form.fulfillmentType,
    backorderAcknowledged: form.backorderAcknowledged,
    ...(pickup ? { pickupBranchSlug: branch.slug } : {}),
    idempotencyKey
  };
}

/**
 * One idempotency key per attempt: retrying the same request reuses it, while any change to the cart or form
 * starts a new attempt with a fresh key. `fingerprint` is the payload without the key.
 */
export function nextIdempotencyKey(previous: { fingerprint: string; key: string } | null, fingerprint: string, makeKey: () => string): { fingerprint: string; key: string } {
  return previous && previous.fingerprint === fingerprint ? previous : { fingerprint, key: makeKey() };
}

export interface Conflict {
  productId: string;
  reason: string;
}

export type CheckoutOutcome =
  | { kind: "redirect"; url: string }
  | { kind: "validation"; message: string; fieldErrors: FormErrors }
  | { kind: "conflict"; conflicts: Conflict[] }
  | { kind: "key-used"; message: string }
  | { kind: "rate-limited"; message: string }
  | { kind: "unavailable"; code: string }
  | { kind: "error"; message: string };

const STRIPE_HOST = "checkout.stripe.com";

export function isStripeCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === STRIPE_HOST && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

function parseConflicts(body: unknown): Conflict[] {
  const list = body && typeof body === "object" ? (body as { conflicts?: unknown }).conflicts : null;
  if (!Array.isArray(list)) return [];
  return list.flatMap((c) => {
    const r = c && typeof c === "object" ? (c as Record<string, unknown>) : null;
    return r && typeof r.productId === "string" ? [{ productId: r.productId, reason: typeof r.reason === "string" ? r.reason : "UNAVAILABLE" }] : [];
  });
}

const DETAIL_FIELDS: Record<string, keyof CheckoutForm> = {
  backorderAcknowledged: "backorderAcknowledged",
  name: "name",
  email: "email",
  phone: "phone",
  address: "address",
  suburb: "suburb",
  postcode: "postcode",
  notes: "notes",
  preferredDeliveryDate: "preferredDate",
  pickupBranchSlug: "branch"
};

function parseFieldErrors(record: Record<string, unknown>): FormErrors {
  const details = record.details && typeof record.details === "object" ? (record.details as Record<string, unknown>) : {};
  const out: FormErrors = {};
  for (const [key, value] of Object.entries(details)) {
    const field = DETAIL_FIELDS[key];
    if (field && typeof value === "string") out[field] = value;
  }
  return out;
}

const KEY_USED_MESSAGE = "This order was already started. If you were taken to the payment page, check your email for confirmation; otherwise review your cart and try again.";

/** Maps an API response to what the UI should do. Only a Stripe-hosted https URL is ever followed. */
export function interpretCheckoutResponse(status: number, body: unknown): CheckoutOutcome {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code = typeof record.code === "string" ? record.code : "";
  if (status === 200) {
    return isStripeCheckoutUrl(record.url)
      ? { kind: "redirect", url: record.url }
      : { kind: "error", message: "We could not start the payment page. Please try again." };
  }
  if (status === 409) {
    if (code === "IDEMPOTENCY_IN_PROGRESS") {
      return { kind: "error", message: "This checkout is still starting. Wait a moment, then retry without changing your cart." };
    }
    return code.startsWith("IDEMPOTENCY_") ? { kind: "key-used", message: KEY_USED_MESSAGE } : { kind: "conflict", conflicts: parseConflicts(body) };
  }
  if (status === 429) return { kind: "rate-limited", message: "Too many attempts. Please wait a minute and try again." };
  if (status === 503) return { kind: "unavailable", code: code || "UNAVAILABLE" };
  if (status >= 400 && status < 500) {
    const message = typeof record.error === "string" && record.error ? record.error : "Please check your details and try again.";
    return { kind: "validation", message, fieldErrors: parseFieldErrors(record) };
  }
  return { kind: "error", message: "We could not confirm checkout. Retry without changing your cart to resume the same checkout." };
}

const CONFLICT_COPY: Record<string, string> = {
  BACKORDER_ACK_REQUIRED: "it is now a backorder; review and acknowledge availability before paying",
  PRICE_CHANGED: "the price changed",
  OUT_OF_STOCK: "it is out of stock",
  INSUFFICIENT_STOCK: "there is not enough stock",
  NOT_FOUND: "it is no longer listed",
  QUANTITY_EXCEEDS_LIMIT: "that quantity is more than we can supply online"
};

export function conflictReason(reason: string): string {
  return CONFLICT_COPY[reason] ?? "it is no longer available to order online";
}

export interface DeliveryInfo {
  checked: boolean;
  eligible: boolean;
  message: string;
  /** Present only when the API supplies an approved fee in cents; never invented client-side. */
  feeCents: number | null;
  minOrderCents: number | null;
  freeDeliveryMinCents: number | null;
}

export const NO_DELIVERY_INFO: DeliveryInfo = { checked: false, eligible: false, message: "", feeCents: null, minOrderCents: null, freeDeliveryMinCents: null };

const cents = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);

/** Reads only the cents-denominated fields; legacy dollar fields are ignored on purpose. */
export function parseDeliveryResponse(body: unknown): DeliveryInfo {
  const r = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    checked: true,
    eligible: r.eligible === true,
    message: typeof r.message === "string" ? r.message : "",
    feeCents: cents(r.deliveryFeeCents),
    minOrderCents: cents(r.minOrderCents),
    freeDeliveryMinCents: cents(r.freeDeliveryMinCents)
  };
}
