import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { stripeSandboxEnabled, verifyStripeSignature } from "@/lib/stripe-sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type EventObject = Record<string, unknown>;
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!stripeSandboxEnabled()) return json({ error: "Not found." }, 404);
  const secret = process.env.STRIPE_TEST_WEBHOOK_SECRET;
  if (!secret) return json({ error: "Webhook is not configured." }, 503);
  if (Number(request.headers.get("content-length") ?? 0) > 256000) return json({ error: "Payload too large." }, 413);
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > 256000) return json({ error: "Payload too large." }, 413);
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) return json({ error: "Invalid signature." }, 400);
  let event: EventObject;
  try { event = JSON.parse(raw) as EventObject; }
  catch { return json({ error: "Invalid payload." }, 400); }
  if (event.account !== undefined && event.account !== "acct_1USJ2G7k4A7HyNzJ") return json({ error: "Wrong Stripe account." }, 400);
  if (typeof event.id !== "string" || typeof event.type !== "string" || event.livemode !== false) return json({ error: "Unexpected event." }, 400);
  const object = (event.data as { object?: EventObject } | undefined)?.object;
  if (!object || typeof object !== "object") return json({ error: "Missing event object." }, 400);
  try {
    await db.$transaction(async tx => {
      await tx.stripeWebhookEvent.create({ data: { id: event.id as string, type: event.type as string } });
      const type = event.type as string;
      if (type.startsWith("checkout.session.")) {
        if (typeof object.id !== "string" || typeof object.client_reference_id !== "string") throw new Error("Missing checkout reference.");
        const order = await tx.order.findFirst({ where: { id: object.client_reference_id, stripeCheckoutSessionId: object.id } });
        if (!order) throw new Error("Checkout order not found. Retry event.");
        if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
          if (object.payment_status === "paid") {
            const amount = object.amount_total;
            if (object.currency !== "aud" || typeof amount !== "number" || amount !== Math.round(order.total * 100)) throw new Error("Checkout amount mismatch.");
            await tx.order.updateMany({ where: { id: order.id, paymentStatus: { in: ["PENDING", "ERROR"] } }, data: {
              paymentStatus: "PAID", orderStatus: "RECEIVED",
              ...(typeof object.payment_intent === "string" ? { stripePaymentIntentId: object.payment_intent } : {})
            } });
          }
        } else if (type === "checkout.session.expired" || type === "checkout.session.async_payment_failed") {
          await tx.order.updateMany({ where: { id: order.id, paymentStatus: "PENDING" }, data: { paymentStatus: "FAILED" } });
        }
      } else if (type === "charge.refunded") {
        const paymentIntent = object.payment_intent;
        if (typeof paymentIntent === "string") {
          const amount = Number(object.amount), refunded = Number(object.amount_refunded);
          if (Number.isSafeInteger(amount) && amount > 0 && Number.isSafeInteger(refunded) && refunded >= 0) {
            await tx.order.updateMany({ where: { stripePaymentIntentId: paymentIntent, paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] } }, data: {
              paymentStatus: refunded >= amount ? "REFUNDED" : "PARTIALLY_REFUNDED"
            } });
          }
        }
      }
      // invoice.paid and invoice.payment_failed are recorded in the event ledger.
      // Stripe's Invoicing dashboard remains the source of truth for wholesale invoices.
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return json({ received: true, duplicate: true }, 200);
    return json({ error: "Event handling failed; Stripe should retry." }, 500);
  }
  return json({ received: true }, 200);
}
