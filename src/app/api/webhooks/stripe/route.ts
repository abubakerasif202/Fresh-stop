import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { sendOrderConfirmationEmails } from "@/lib/email";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.warn("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown signature error";
    console.error(`⚠️ Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  // Idempotency check: prevent duplicate event processing
  try {
    const existingEvent = await db.paymentEvent.findUnique({
      where: { stripeEventId: event.id }
    });

    if (existingEvent) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (err) {
    console.error("PaymentEvent lookup error:", err);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.client_reference_id || session.metadata?.orderId;
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : null;

        if (orderId) {
          const order = await db.order.findUnique({
            where: { id: orderId }
          });

          if (order) {
            // Update order to PAID
            const updated = await db.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: "PAID",
                orderStatus: "PREPARING",
                stripePaymentIntentId: paymentIntentId
              }
            });

            // Parse items and send emails
            try {
              interface RawOrderItem {
                name?: string;
                unit?: string;
                quantity?: number;
                priceDollars?: number;
                priceCents?: number;
                totalDollars?: number;
                totalCents?: number;
              }
              const parsedItems = JSON.parse(order.itemsJson || "[]") as RawOrderItem[];
              await sendOrderConfirmationEmails({
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                customerPhone: order.customerPhone,
                fulfillmentType: order.fulfillmentType,
                deliveryAddress: order.deliveryAddress,
                deliverySuburb: order.deliverySuburb,
                deliveryPostcode: order.deliveryPostcode,
                deliveryNotes: order.deliveryNotes,
                preferredDeliveryDate: order.preferredDeliveryDate,
                items: parsedItems.map((i) => ({
                  name: i.name || "Item",
                  unit: i.unit || "each",
                  quantity: i.quantity || 1,
                  priceDollars: i.priceDollars || (i.priceCents ? i.priceCents / 100 : 0),
                  totalDollars: i.totalDollars || (i.totalCents ? i.totalCents / 100 : 0)
                })),
                subtotal: updated.subtotal,
                deliveryFee: updated.deliveryFee,
                gstTotal: updated.gstTotal,
                total: updated.total
              });
            } catch (emailErr) {
              console.error("Non-fatal email notification error:", emailErr);
            }
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const order = await db.order.findFirst({
          where: { stripePaymentIntentId: paymentIntent.id }
        });
        if (order) {
          await db.order.update({
            where: { id: order.id },
            data: { paymentStatus: "FAILED" }
          });
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.client_reference_id || session.metadata?.orderId;
        if (orderId) {
          await db.order.update({
            where: { id: orderId },
            data: { orderStatus: "CANCELLED" }
          });
        }
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }

    // Record processed event for idempotency
    await db.paymentEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        status: "PROCESSED",
        payload: JSON.stringify({
          id: event.id,
          created: event.created
        })
      }
    });

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook processing error:", message);
    return NextResponse.json({ error: `Webhook processing error: ${message}` }, { status: 500 });
  }
}
