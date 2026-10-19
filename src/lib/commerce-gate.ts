import type { PrismaClient } from "@prisma/client";
import { db } from "./db";

/**
 * Two-key gate for paid checkout. Both halves must be on, Stripe must be in
 * test mode, and (for delivery) at least one delivery zone must be approved.
 * Fails closed on any error. Default: OFF.
 */

export const PAID_CHECKOUT_DB_FLAG = "paidCheckoutApproved";

export type GateReasonCode =
  | "DEMO_MODE"
  | "ENV_DISABLED"
  | "DB_FLAG_OFF"
  | "STRIPE_KEY_MISSING"
  | "STRIPE_LIVE_KEY_REJECTED"
  | "STRIPE_KEY_INVALID"
  | "NO_APPROVED_ZONE"
  | "DB_ERROR";

export interface PaidCheckoutStatus {
  enabled: boolean;
  /** Generic, public-safe explanations. Never contains secrets or configuration detail. */
  reasons: string[];
  /** Internal machine-readable codes for routing and tests; do not expose to clients. */
  codes: GateReasonCode[];
}

export type GateClient = Pick<PrismaClient, "deliverySetting" | "deliveryZone">;

export interface GateOptions {
  fulfillment?: "DELIVERY" | "PICKUP";
  client?: GateClient;
  env?: Readonly<Record<string, string | undefined>>;
}

const GENERIC_UNAVAILABLE = "Online checkout is not available at the moment. Please enquire and we will help.";
const GENERIC_NO_DELIVERY = "Online delivery is not available yet. Please enquire and we will help.";

const REASON_TEXT: Record<GateReasonCode, string> = {
  DEMO_MODE: GENERIC_UNAVAILABLE,
  ENV_DISABLED: GENERIC_UNAVAILABLE,
  DB_FLAG_OFF: GENERIC_UNAVAILABLE,
  STRIPE_KEY_MISSING: GENERIC_UNAVAILABLE,
  STRIPE_LIVE_KEY_REJECTED: GENERIC_UNAVAILABLE,
  STRIPE_KEY_INVALID: GENERIC_UNAVAILABLE,
  NO_APPROVED_ZONE: GENERIC_NO_DELIVERY,
  DB_ERROR: GENERIC_UNAVAILABLE
};

/** Local key-prefix check: only Stripe test-mode keys are accepted. */
export function classifyStripeKey(key: string | undefined): GateReasonCode | null {
  if (!key) return "STRIPE_KEY_MISSING";
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "STRIPE_LIVE_KEY_REJECTED";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return null;
  return "STRIPE_KEY_INVALID";
}

function result(codes: GateReasonCode[]): PaidCheckoutStatus {
  const reasons = Array.from(new Set(codes.map((code) => REASON_TEXT[code])));
  return { enabled: codes.length === 0, reasons, codes };
}

async function readDatabaseHalf(client: GateClient, fulfillment: "DELIVERY" | "PICKUP"): Promise<GateReasonCode[]> {
  try {
    const codes: GateReasonCode[] = [];
    const flag = await client.deliverySetting.findUnique({ where: { key: PAID_CHECKOUT_DB_FLAG } });
    if (flag?.value !== "true") codes.push("DB_FLAG_OFF");
    if (fulfillment === "DELIVERY") {
      const zones = await client.deliveryZone.count({
        where: { isActive: true, isApproved: true, deliveryFeeCents: { not: null } }
      });
      if (zones === 0) codes.push("NO_APPROVED_ZONE");
    }
    return codes;
  } catch {
    return ["DB_ERROR"];
  }
}

export async function getPaidCheckoutStatus(options: GateOptions = {}): Promise<PaidCheckoutStatus> {
  const env = options.env ?? process.env;
  // Demonstration prices must never reach a payment session, even if other gates are enabled.
  if (env.NEXT_PUBLIC_STOREFRONT_DEMO === "true") return result(["DEMO_MODE"]);
  const codes: GateReasonCode[] = [];
  if (env.PAID_CHECKOUT_ENABLED !== "true") codes.push("ENV_DISABLED");
  const keyProblem = classifyStripeKey(env.STRIPE_SECRET_KEY);
  if (keyProblem) codes.push(keyProblem);
  // No database access at all while the environment half is off or the key is unusable.
  if (codes.length > 0) return result(codes);
  return result(await readDatabaseHalf(options.client ?? db, options.fulfillment ?? "DELIVERY"));
}
