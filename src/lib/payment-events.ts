import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { db } from "./db";
import { resendOrderEmails } from "./email";
import { handleStripeEvent, TransientWebhookError, type HandlerOutcome } from "./payment-handlers";

/** A PROCESSING claim older than this is considered abandoned (crashed worker) and may be re-claimed. */
export const STALE_PROCESSING_MS = 5 * 60 * 1000;
const MAX_ERROR_LENGTH = 300;
const PG_UNIQUE_VIOLATION = "P2002";

export type ProcessResult =
  | { kind: "processed" }
  | { kind: "ignored"; reason: string }
  | { kind: "flagged"; reason: string }
  | { kind: "duplicate" }
  | { kind: "in_progress" }
  | { kind: "error" };

type ClaimResult = "claimed" | "duplicate" | "in_progress";

/** Error text safe to persist/log: class + code + truncated message with emails removed. */
export function safeErrorSummary(error: unknown): string {
  const name = error instanceof Error ? error.name : "UnknownError";
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? ` ${error.code}` : "";
  // Provider/Prisma messages can contain addresses, credentials or query arguments.
  const message = error instanceof TransientWebhookError ? error.message : "";
  const redacted = message.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").replace(/\s+/g, " ");
  return `${name}${code}: ${redacted}`.slice(0, MAX_ERROR_LENGTH);
}

function objectId(event: Stripe.Event): string | null {
  const object: unknown = event.data.object;
  if (object && typeof object === "object" && "id" in object && typeof object.id === "string") return object.id;
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === PG_UNIQUE_VIOLATION;
}

/**
 * Claims the event with a unique insert. Existing rows: PROCESSED/IGNORED are duplicates; FAILED and stale
 * PROCESSING rows are atomically re-claimed (conditional UPDATE); a fresh PROCESSING row belongs to another worker.
 * `processedAt` doubles as the "last state change" timestamp while PROCESSING.
 */
async function claimEvent(event: Stripe.Event, now: Date): Promise<ClaimResult> {
  try {
    await db.paymentEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        status: "PROCESSING",
        attempts: 1,
        processedAt: now,
        stripeObjectId: objectId(event),
        livemode: event.livemode,
        // Metadata only: no customer data is persisted from the payload.
        payload: JSON.stringify({ id: event.id, type: event.type, created: event.created })
      }
    });
    return "claimed";
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
  const staleBefore = new Date(now.getTime() - STALE_PROCESSING_MS);
  const reclaimed = await db.paymentEvent.updateMany({
    where: {
      stripeEventId: event.id,
      OR: [{ status: "FAILED" }, { status: "PROCESSING", processedAt: { lt: staleBefore } }]
    },
    data: { status: "PROCESSING", attempts: { increment: 1 }, processedAt: now, lastError: null }
  });
  if (reclaimed.count === 1) return "claimed";
  const existing = await db.paymentEvent.findUnique({ where: { stripeEventId: event.id }, select: { status: true } });
  return existing?.status === "PROCESSING" ? "in_progress" : "duplicate";
}

function finalRecord(outcome: HandlerOutcome, now: Date): { status: string; lastError: string | null; processedAt: Date } {
  switch (outcome.status) {
    case "PROCESSED":
      return { status: "PROCESSED", lastError: outcome.lastError ?? null, processedAt: now };
    case "IGNORED":
      return { status: "IGNORED", lastError: outcome.reason, processedAt: now };
    case "FLAGGED":
      return { status: "FAILED", lastError: outcome.reason, processedAt: now };
  }
}

async function runClaimed(event: Stripe.Event, now: Date): Promise<HandlerOutcome> {
  return db.$transaction(async (tx) => {
    const outcome = await handleStripeEvent(tx, event, now);
    await tx.paymentEvent.update({ where: { stripeEventId: event.id }, data: finalRecord(outcome, now) });
    return outcome;
  });
}

async function markFailed(event: Stripe.Event, error: unknown): Promise<void> {
  const summary = safeErrorSummary(error);
  console.error(`[stripe-webhook] event=${event.id} type=${event.type} failed: ${summary}`);
  await db.paymentEvent
    .update({ where: { stripeEventId: event.id }, data: { status: "FAILED", lastError: summary, processedAt: new Date() } })
    .catch(() => undefined);
}

function toResult(outcome: HandlerOutcome): ProcessResult {
  if (outcome.status === "IGNORED") return { kind: "ignored", reason: outcome.reason };
  if (outcome.status === "FLAGGED") return { kind: "flagged", reason: outcome.reason };
  return { kind: "processed" };
}

/**
 * Idempotent processing of one verified Stripe event. Never throws for handler failures:
 * those mark the PaymentEvent FAILED and return {kind:"error"} so the route answers 500 and Stripe retries.
 * Emails are sent after the transaction commits and cannot affect the result.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<ProcessResult> {
  const now = new Date();
  const claim = await claimEvent(event, now);
  if (claim !== "claimed") {
    if (claim === "duplicate" && ["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
      const order = await db.order.findFirst({ where: {
        stripeSessionId: objectId(event), paymentStatus: "PAID",
        orderStatus: { in: ["RECEIVED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"] }
      }, select: { id: true } });
      if (order) await resendOrderEmails(order.id).catch(() => undefined);
    }
    return { kind: claim };
  }
  let outcome: HandlerOutcome;
  try {
    outcome = await runClaimed(event, now);
  } catch (error) {
    await markFailed(event, error);
    return { kind: "error" };
  }
  if (outcome.status === "PROCESSED" && outcome.emailOrderId) {
    await resendOrderEmails(outcome.emailOrderId).catch(() => undefined);
  }
  return toResult(outcome);
}
