import { db } from "./db";
import { AdminHttpError, recordAudit } from "./admin-audit";
import { PAID_CHECKOUT_DB_FLAG } from "./commerce-gate";

export const ENABLE_PHRASE = "ENABLE PAID CHECKOUT";

/** Flip the database half of the two-key paid-checkout gate. Enabling needs the typed phrase; disabling never does. */
export function setPaidCheckoutApproved(enabled: unknown, confirmation: unknown, admin: string) {
  if (typeof enabled !== "boolean") throw new AdminHttpError(422, "enabled must be true or false.");
  if (enabled && confirmation !== ENABLE_PHRASE) {
    throw new AdminHttpError(422, `Type "${ENABLE_PHRASE}" to confirm.`, { code: "CONFIRMATION_REQUIRED" });
  }
  return db.$transaction(async (tx) => {
    const before = await tx.deliverySetting.findUnique({ where: { key: PAID_CHECKOUT_DB_FLAG } });
    const value = enabled ? "true" : "false";
    await tx.deliverySetting.upsert({
      where: { key: PAID_CHECKOUT_DB_FLAG }, create: { key: PAID_CHECKOUT_DB_FLAG, value }, update: { value }
    });
    await recordAudit(tx, {
      action: enabled ? "PAID_CHECKOUT_APPROVED" : "PAID_CHECKOUT_UNAPPROVED", entityType: "DeliverySetting", entityId: PAID_CHECKOUT_DB_FLAG, admin,
      before: { value: before?.value ?? null }, after: { value }, details: `Paid checkout database flag set to ${value}`
    });
    return { enabled };
  });
}
