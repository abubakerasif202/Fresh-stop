import type Stripe from "stripe";
import type { ValidatedOrderResult } from "./order-pricing";

/**
 * Stripe Checkout Session construction. The Stripe client is injected through
 * the narrow StripeLike interface so unit tests never touch the network.
 */

/** Stripe requires expires_at to be at least 30 minutes ahead; a 60s buffer absorbs request latency. */
export const STRIPE_SESSION_TTL_SECONDS = 30 * 60 + 60;
/** Stock stays reserved a little longer than the session so the expiry webhook normally wins the race. */
export const RESERVATION_TTL_MINUTES = 36;

export interface StripeSessionLike {
  id: string;
  url: string | null;
  status?: string | null;
}

export interface StripeLike {
  checkout: {
    sessions: {
      create(params: Stripe.Checkout.SessionCreateParams, options?: Stripe.RequestOptions): Promise<StripeSessionLike>;
      retrieve(id: string): Promise<StripeSessionLike>;
      expire?(id: string): Promise<unknown>;
    };
  };
}

/** Adapts the real Stripe SDK client to StripeLike. */
export function toStripeLike(client: Stripe): StripeLike {
  return {
    checkout: {
      sessions: {
        create: (params, options) => client.checkout.sessions.create(params, options),
        retrieve: (id) => client.checkout.sessions.retrieve(id),
        expire: (id) => client.checkout.sessions.expire(id)
      }
    }
  };
}

export interface SessionOrderContext {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  accessToken: string;
  siteBase: string;
  nowMs: number;
}

function absoluteHttpsImage(imageUrl: string, siteBase: string): string[] {
  if (imageUrl.startsWith("https://")) return [imageUrl];
  if (imageUrl.startsWith("/") && !imageUrl.startsWith("//") && siteBase.startsWith("https://")) return [`${siteBase}${imageUrl}`];
  return [];
}

function lineItems(priced: ValidatedOrderResult, siteBase: string): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const items: Stripe.Checkout.SessionCreateParams.LineItem[] = priced.items.map((item) => {
    const images = absoluteHttpsImage(item.imageUrl, siteBase);
    return {
      quantity: item.quantity,
      price_data: {
        currency: "aud",
        unit_amount: item.priceCents,
        product_data: {
          name: item.name,
          description: `${item.unit} ${item.taxCategory === "GST_FREE" ? "(GST free)" : "(includes GST)"}`,
          ...(images.length > 0 ? { images } : {})
        }
      }
    };
  });
  if (priced.deliveryFeeCents > 0) {
    items.push({
      quantity: 1,
      price_data: {
        currency: "aud",
        unit_amount: priced.deliveryFeeCents,
        product_data: { name: `Delivery (${priced.zoneName ?? "local delivery"})` }
      }
    });
  }
  return items;
}

/** Metadata carries only the order reference: no customer data ever goes into Stripe metadata. */
export function buildSessionParams(priced: ValidatedOrderResult, ctx: SessionOrderContext): Stripe.Checkout.SessionCreateParams {
  const metadata = { orderId: ctx.orderId, orderNumber: ctx.orderNumber };
  const token = encodeURIComponent(ctx.accessToken);
  return {
    mode: "payment",
    line_items: lineItems(priced, ctx.siteBase),
    customer_email: ctx.customerEmail,
    client_reference_id: ctx.orderId,
    metadata,
    payment_intent_data: { metadata },
    expires_at: Math.floor(ctx.nowMs / 1000) + STRIPE_SESSION_TTL_SECONDS,
    success_url: `${ctx.siteBase}/order-confirmation/${ctx.orderNumber}?t=${token}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ctx.siteBase}/checkout?cancelled=1`
  };
}
