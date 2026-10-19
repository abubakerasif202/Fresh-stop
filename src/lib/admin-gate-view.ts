import type { GateReasonCode, PaidCheckoutStatus } from "./commerce-gate";

/** Operator-facing explanations. The public API keeps generic text; admins see the specific blocker. */
export const GATE_ADMIN_TEXT: Record<GateReasonCode, string> = {
  DEMO_MODE: "Presentation mode is active. Disable it only after business and payment approval.",
  ENV_DISABLED: "Environment variable PAID_CHECKOUT_ENABLED is not set to true.",
  DB_FLAG_OFF: "The database approval below is off.",
  STRIPE_KEY_MISSING: "No Stripe secret key is configured.",
  STRIPE_LIVE_KEY_REJECTED: "A live Stripe key is configured. Only test-mode keys are accepted.",
  STRIPE_KEY_INVALID: "The Stripe key is not a test-mode key (sk_test_ or rk_test_).",
  NO_APPROVED_ZONE: "No approved delivery zone exists (needed for delivery orders).",
  DB_ERROR: "The database could not be read, so checkout is closed."
};

export function describeGate(status: PaidCheckoutStatus) {
  return { enabled: status.enabled, reasons: status.codes.map((code) => GATE_ADMIN_TEXT[code]) };
}
