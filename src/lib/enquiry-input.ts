/** Explicit validation of the untrusted public enquiry body. Nothing is trusted beyond these checks. */

export const HONEYPOT_FIELD = "website";
export const ENQUIRY_KINDS = ["WHOLESALE", "CONTACT"] as const;
export type EnquiryKindValue = (typeof ENQUIRY_KINDS)[number];

export const ENQUIRY_LIMITS = {
  name: 100,
  businessName: 150,
  email: 254,
  products: 2000,
  estimatedQuantity: 200,
  message: 4000
} as const;

export const MAX_ENQUIRY_BODY_BYTES = 16 * 1024;

export interface EnquiryInput {
  kind: EnquiryKindValue;
  name: string;
  businessName: string | null;
  email: string;
  phone: string;
  products: string | null;
  estimatedQuantity: string | null;
  message: string | null;
}

export type EnquiryInputResult =
  | { ok: true; value: EnquiryInput; honeypotTripped: false }
  | { ok: false; errors: Record<string, string>; honeypotTripped: boolean };

const EMAIL = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()"]{2,}$/;
const AU_PHONE = /^(?:\+?61|0)[2-478]\d{8}$/;
const INTERNATIONAL_PHONE = /^\+[1-9]\d{7,14}$/;

function hasControlChars(value: string, allowNewlines: boolean): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    const newline = code === 10 || code === 13 || code === 9;
    if ((code < 32 && !(allowNewlines && newline)) || code === 127) return true;
  }
  return false;
}

/** Returns the trimmed string, "" when absent, or null when the value is unusable. */
function text(value: unknown, max: number, multiline = false): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max * 2 || hasControlChars(value, multiline)) return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

function normalisePhone(value: string): string {
  return value.replace(/[\s\-().]/g, "");
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function validateEnquiryBody(raw: unknown): EnquiryInputResult {
  if (!isRecord(raw)) return { ok: false, errors: { body: "Invalid request." }, honeypotTripped: false };
  const trap = raw[HONEYPOT_FIELD];
  if (typeof trap === "string" ? trap.trim() !== "" : trap !== undefined && trap !== null && trap !== false) {
    return { ok: false, errors: {}, honeypotTripped: true };
  }
  const errors: Record<string, string> = {};
  const kind = ENQUIRY_KINDS.find((k) => k === raw.kind);
  if (!kind) errors.kind = "Please choose a valid enquiry type.";

  const name = text(raw.name, ENQUIRY_LIMITS.name);
  if (!name) errors.name = name === null ? "Please enter a valid name." : "Please enter your name.";
  const businessName = text(raw.businessName, ENQUIRY_LIMITS.businessName);
  if (businessName === null) errors.businessName = "Please enter a valid business name.";
  else if (kind === "WHOLESALE" && !businessName) errors.businessName = "Please enter your business name.";
  const email = text(raw.email, ENQUIRY_LIMITS.email);
  if (!email || !EMAIL.test(email)) errors.email = "Please enter a valid email address.";
  const phoneText = text(raw.phone, 40);
  const phone = phoneText === null ? "" : normalisePhone(phoneText);
  if (!(AU_PHONE.test(phone) || INTERNATIONAL_PHONE.test(phone))) errors.phone = "Please enter a valid phone number.";
  const products = text(raw.products, ENQUIRY_LIMITS.products, true);
  if (products === null) errors.products = "Please check what you entered for products.";
  else if (kind === "WHOLESALE" && !products) errors.products = "Please tell us which products you need.";
  const estimatedQuantity = text(raw.estimatedQuantity, ENQUIRY_LIMITS.estimatedQuantity);
  if (estimatedQuantity === null) errors.estimatedQuantity = "Please check the estimated quantity.";
  const message = text(raw.message, ENQUIRY_LIMITS.message, true);
  if (message === null) errors.message = "Your message is too long or contains invalid characters.";
  else if (kind === "CONTACT" && !message) errors.message = "Please write a message.";

  if (Object.keys(errors).length > 0 || !kind) return { ok: false, errors, honeypotTripped: false };
  return {
    ok: true,
    honeypotTripped: false,
    value: {
      kind, name: name as string, businessName: businessName || null, email: email as string, phone,
      products: products || null, estimatedQuantity: estimatedQuantity || null, message: message || null
    }
  };
}
