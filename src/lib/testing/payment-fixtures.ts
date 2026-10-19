import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { generateOrderAccessToken } from "../order-access";
import { reserveStock } from "../inventory";
import { createTestOrder, createTestProduct, uniqueId } from "./db-fixtures";

export interface PaymentScenario {
  orderId: string;
  orderNumber: string;
  productId: string;
  sessionId: string;
  totalCents: number;
  quantity: number;
  accessToken: string;
}

/** Order + product + ACTIVE reservation, as the checkout route would leave them. */
export async function createPendingScenario(
  db: PrismaClient,
  categoryId: string,
  options: { stock?: number; quantity?: number; unitCents?: number; orderOverrides?: Record<string, unknown> } = {}
): Promise<PaymentScenario> {
  const { stock = 10, quantity = 2, unitCents = 500, orderOverrides = {} } = options;
  const product = await createTestProduct(db, categoryId, { stockQuantity: stock, priceCents: unitCents });
  const sessionId = `cs_test_${randomBytes(8).toString("hex")}`;
  const { token, hash } = generateOrderAccessToken();
  const totalCents = unitCents * quantity;
  const order = await createTestOrder(db, {
    stripeSessionId: sessionId,
    accessTokenHash: hash,
    totalCents,
    total: totalCents / 100,
    subtotal: totalCents / 100,
    ...orderOverrides
  });
  await db.orderItem.create({
    data: {
      orderId: order.id,
      productId: product.id,
      name: "Test <b>Item</b>",
      quantity,
      unit: "each",
      priceCents: unitCents,
      totalCents
    }
  });
  await db.$transaction((tx) => reserveStock(tx, order.id, [{ productId: product.id, quantity }], 30));
  return { orderId: order.id, orderNumber: order.orderNumber, productId: product.id, sessionId, totalCents, quantity, accessToken: token };
}

interface SessionEventOptions {
  type?:
    | "checkout.session.completed"
    | "checkout.session.async_payment_succeeded"
    | "checkout.session.async_payment_failed"
    | "checkout.session.expired";
  eventId?: string;
  sessionId?: string;
  orderId?: string;
  amountTotal?: number | null;
  currency?: string;
  paymentStatus?: "paid" | "unpaid" | "no_payment_required";
  livemode?: boolean;
  account?: string;
  paymentIntent?: string | null;
}

/** Test events are partial fixtures; widening to object makes the single assertion to Stripe.Event explicit. */
function asEvent(raw: object): Stripe.Event {
  return raw as Stripe.Event;
}

export function sessionEvent(scenario: PaymentScenario, options: SessionEventOptions = {}): Stripe.Event {
  return asEvent({
    id: options.eventId ?? uniqueId("evt_test"),
    object: "event",
    type: options.type ?? "checkout.session.completed",
    livemode: options.livemode ?? false,
    created: Math.floor(Date.now() / 1000),
    ...(options.account ? { account: options.account } : {}),
    data: {
      object: {
        id: options.sessionId ?? scenario.sessionId,
        object: "checkout.session",
        client_reference_id: options.orderId ?? scenario.orderId,
        metadata: { orderId: options.orderId ?? scenario.orderId },
        amount_total: options.amountTotal === undefined ? scenario.totalCents : options.amountTotal,
        currency: options.currency ?? "aud",
        payment_status: options.paymentStatus ?? "paid",
        payment_intent: options.paymentIntent === undefined ? `pi_test_${scenario.orderId}` : options.paymentIntent
      }
    }
  });
}

export function paymentIntentFailedEvent(scenario: PaymentScenario, eventId = uniqueId("evt_test")): Stripe.Event {
  return asEvent({
    id: eventId,
    object: "event",
    type: "payment_intent.payment_failed",
    livemode: false,
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: `pi_test_${scenario.orderId}`, object: "payment_intent", metadata: { orderId: scenario.orderId } } }
  });
}

export function chargeRefundedEvent(paymentIntent: string, amountRefunded: number, eventId = uniqueId("evt_test")): Stripe.Event {
  return asEvent({
    id: eventId,
    object: "event",
    type: "charge.refunded",
    livemode: false,
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: uniqueId("ch_test"), object: "charge", currency: "aud", payment_intent: paymentIntent, amount_refunded: amountRefunded } }
  });
}
