export type CommerceState = "VERIFIED" | "SUGGESTED" | "PENDING_APPROVAL" | "MISSING_CONFIGURATION";

/** Client-safe labels (no dataset imports). */
export const COMMERCE_STATE_LABEL: Record<CommerceState, string> = {
  VERIFIED: "Verified",
  SUGGESTED: "Suggested",
  PENDING_APPROVAL: "Pending approval",
  MISSING_CONFIGURATION: "Missing configuration"
};

/** Largest batch that may be approved at the suggested price in one action. */
export const MAX_BULK_APPROVE = 10;
export const bulkConfirmationPhrase = (count: number) => `APPROVE ${count} PRICES`;
