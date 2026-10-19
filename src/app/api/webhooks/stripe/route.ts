import { NextResponse } from "next/server";
import { getStripe, verifyStripeAccount } from "@/lib/stripe";
import { processStripeEvent } from "@/lib/payment-events";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const reply = (body: Record<string, unknown>, status: number) => NextResponse.json(body, { status, headers: NO_STORE });

function resolveClient(): Stripe | null {
  try {
    return getStripe();
  } catch {
    return null; // live key refused or misconfigured: behave as not configured
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const client = resolveClient();
  if (!client || !webhookSecret) return reply({ error: "Webhook not configured." }, 503);

  const signature = request.headers.get("stripe-signature");
  if (!signature) return reply({ error: "Invalid webhook request." }, 400);

  let event: Stripe.Event;
  try {
    // Signature is computed over the exact raw body: never parse before verifying.
    const rawBody = await request.text();
    event = client.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return reply({ error: "Invalid webhook request." }, 400);
  }

  try {
    if (!(await verifyStripeAccount(client)).ok) return reply({ error: "Webhook not configured." }, 503);
    const result = await processStripeEvent(event);
    switch (result.kind) {
      case "duplicate":
        return reply({ received: true, duplicate: true }, 200);
      case "in_progress":
        return reply({ received: false, retry: true }, 409);
      case "error":
        return reply({ error: "Webhook processing failed." }, 500);
      default:
        return reply({ received: true }, 200);
    }
  } catch {
    return reply({ error: "Webhook processing failed." }, 500);
  }
}
