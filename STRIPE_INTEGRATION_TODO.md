# Fresh Stop — Stripe Integration TODO

## Status
**Development branch only. Do not merge, deploy, or enable paid checkout yet.**

This branch applies the hosted Checkout Studio selections to the existing Stripe Checkout Session creation call while retaining application-required order and inventory fields. It intentionally does **not** implement a new API route, duplicate Stripe client, or webhook.

Stripe SDK: `stripe@23.0.0`. Checkout: one-time `payment` in AUD. Intended test-mode Stripe account: `acct_1USJ2G7k4A7HyNzJ`.

## Values to Replace

**None in the Checkout Session call.** The existing implementation uses server-priced `price_data` and actual application return paths, not placeholder Stripe Price IDs.

**Files using the real Checkout fields:**
- [src/lib/checkout-stripe.ts](src/lib/checkout-stripe.ts) — server-priced `line_items`, order metadata, customer email, session expiry, success/cancel URLs.
- [src/lib/checkout-service.ts](src/lib/checkout-service.ts) — creates Stripe Checkout Sessions.

Operational configuration still needs to be supplied privately and validated before checkout can be turned on. Do not commit API keys.

## Configured Parameters

**File:** [src/lib/checkout-service.ts](src/lib/checkout-service.ts)

| Parameter | Value |
| --- | --- |
| `ui_mode` | `hosted_page` (Stripe SDK 23.x) |
| `mode` | `payment` — existing one-time purchases |
| `billing_address_collection` | `auto` |
| `phone_number_collection.enabled` | `false` |
| `automatic_tax.enabled` | `false` |
| `allow_promotion_codes` | `false` |
| `submit_type` | `auto` |
| `integration_identifier` | `hosted_web_0001` |
| `origin_context` | `web` |

`payment_method_collection` is omitted in one-time payment mode in accordance with the supplied conditional rule.

### Additional existing parameters retained for operational safety

- `client_reference_id` and `metadata.orderId` connect `checkout.session.*` events to the order; [payment-handlers.ts](src/lib/payment-handlers.ts) requires them for reconciliation.
- `payment_intent_data.metadata` supports `payment_intent.payment_failed` processing.
- `expires_at` keeps Stripe Checkout expiration aligned with the inventory reservation.
- `customer_email` keeps the existing checkout email behavior.
- Existing `line_items`, `mode`, `success_url`, `cancel_url`, and request-level idempotency keys are preserved.

**Important conflict with the supplied Stripe Studio instruction:** it directed Scenario A to remove all parameters absent from Field Intents. Doing so causes the existing webhook order lookup to fail and leaves stock-expiry behavior inconsistent. This branch prioritizes a working, secure payment flow. Do not replace the call with a field allowlist unless the order reconciliation and inventory expiry logic are redesigned and tested together.

## Setup and Next Steps

1. Use [`.env.example`](.env.example) for required environment variable names. Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` server-side; the existing browser key, if needed, is `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Next.js).
2. Ensure the rotated test secret belongs to `acct_1USJ2G7k4A7HyNzJ` and `STRIPE_EXPECTED_ACCOUNT` matches. Never place secrets in Git or public Next.js variables.
3. Keep `STRIPE_ALLOW_LIVE` unset/false, and `PAID_CHECKOUT_ENABLED` disabled until all relevant owner-approved prices, stock, delivery settings, and payment tests pass. The site may stay available as a demonstration without charging customers.
4. Set `NEXT_PUBLIC_SITE_URL` to the intended site origin for return URLs. Configure a signed Stripe webhook pointing to `/api/webhooks/stripe`; verify the webhook signing secret privately.
5. Run `npm run typecheck`, `npm run lint`, `npm test` with the project's safe test database configured, and `npm run build`. In particular verify [checkout-service.test.ts](src/lib/checkout-service.test.ts), [payment-events.test.ts](src/lib/payment-events.test.ts), and [webhook route tests](src/app/api/webhooks/stripe/route.test.ts).
6. Perform end-to-end **test-mode-only** checkout, cancel, duplicate webhook/idempotency, successful payment, payment failure, session expiration and stock restoration; verify records against Stripe account and order IDs. Stripe test card: `4242 4242 4242 4242`, any future expiry and 3-digit CVC.
7. Confirm the intended checkout behavior with the store owner and complete release review before separately authorizing a production deployment or customer charges.

## How it works

The existing server endpoint validates the cart, computes AUD prices and delivery charges, creates an order and stock reservation, and opens a Stripe-hosted Checkout Session. Stripe redirects to existing confirmation or checkout URLs. Signed webhook events reconcile Session and PaymentIntent metadata back to the order, update payment state and commit/release inventory.

**Changes on this branch:** only the Stripe call in [src/lib/checkout-service.ts](src/lib/checkout-service.ts) and this TODO document.

**Validation:** This branch has not yet been run through local typecheck, lint, full database-backed tests, build, or Stripe API calls. The prior Codex log reported typecheck/lint and 19 targeted tests for its *different, unsafe local modification*, not for this branch. Do not treat those prior results as validation of these changes.

Resources: https://support.stripe.com and https://docs.stripe.com/mcp
