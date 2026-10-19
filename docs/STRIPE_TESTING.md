# Stripe testing

Test mode only, account `acct_1USJ2G7k4A7HyNzJ`. Never use live keys. The Stripe MCP account `acct_1USJ246bUDM9kb4q` is a different account and must not be used.

## Checkout

### Status: real-Stripe verification is NOT TESTED

No Stripe test key was available during the hardening work. Everything below the Stripe API boundary is verified only against an injected mock (`StripeLike` in `src/lib/checkout-stripe.ts`). The following are NOT TESTED against real Stripe:

- Creating a real Checkout Session (parameter acceptance, `expires_at` window, `payment_intent_data.metadata`)
- Redirect to the hosted page and back to `success_url` / `cancel_url`
- Card success, decline, 3DS and async payment flows
- Session expiry and the matching reservation release
- Idempotent re-creation using the Stripe `Idempotency-Key` header

### What is automatically tested

Run with the disposable database exported (see CONTRACT / `node scripts/db-local.mjs start`):

```
export DATABASE_URL=postgresql://fs_dev:fs_dev@localhost:54329/fresh_stop_dev
export DATABASE_URL_UNPOOLED=$DATABASE_URL
npm test
```

Covered by `src/lib/checkout-service.test.ts` and friends: gate off (no DB writes), price tampering ignored, unapproved or unverified products rejected, stale-stock 409s with a conflict list, concurrent last-unit checkouts, idempotent replays, Stripe failure releasing stock, amounts always `aud` and server-computed, no customer PII in Stripe metadata, request body cap, rate limiting, database outage failing closed.

### Gate (all must be true or checkout returns 503)

1. `PAID_CHECKOUT_ENABLED=true` in the environment
2. `DeliverySetting` row `paidCheckoutApproved` = `true` (the database half; set it only after sign-off)
3. `STRIPE_SECRET_KEY` starts with `sk_test_` or `rk_test_` (live keys are rejected)
4. For delivery orders, at least one `DeliveryZone` with `isApproved = true` and a non-null `deliveryFeeCents`

Check it any time: `GET /api/checkout/status` returns `{ "enabled": boolean, "reasons"?: string[] }` (generic reasons only).

### Manual steps to verify with real Stripe (test mode)

1. Install the Stripe CLI and sign in to the correct account:
   `stripe login` then confirm the account id shown is `acct_1USJ2G7k4A7HyNzJ` (test mode). Stop if it is any other account.
2. Create a restricted or secret **test** key in the dashboard for that account and put it in `.env.local` as `STRIPE_SECRET_KEY` (never commit it).
3. Start the disposable database and app with local env only:
   `node scripts/db-local.mjs start`, then run Next with `DATABASE_URL` and `DATABASE_URL_UNPOOLED` pointing at `postgresql://fs_dev:fs_dev@localhost:54329/fresh_stop_dev`.
4. Forward webhooks (the webhook handler is documented in the webhook section of this file):
   `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   and set the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET`.
5. On the disposable database only, create an approved delivery zone, an admin-approved product with verified stock, then open the gate:
   `PAID_CHECKOUT_ENABLED=true` and `paidCheckoutApproved = 'true'`.
6. Place orders through the checkout page and confirm each outcome in the dashboard and the database:
   - Success: card `4242 4242 4242 4242`, any future expiry, any CVC. Expect order `PAID` after the webhook, reservation `COMMITTED`, stock decremented.
   - Generic decline: `4000 0000 0000 0002`. Expect the session to stay open and the order `PENDING`.
   - Insufficient funds decline: `4000 0000 0000 9995`. Expect no payment and the order not `PAID`.
   - 3D Secure required: `4000 0025 0000 3155`; complete and also fail the challenge.
   - Async / delayed methods if enabled for the account (for example bank debits): expect `PENDING` until `async_payment_succeeded`, or release on `async_payment_failed`.
7. Expiry: create a session and let it expire (or expire it from the dashboard or `stripe checkout sessions expire <id>`). Expect the reservation `EXPIRED` and stock returned.
8. Abandon test: start checkout, close the tab. After about 36 minutes, `GET /api/checkout/expire` with `Authorization: Bearer $CRON_SECRET` should return the stock (`CRON_SECRET` must be set; the endpoint is closed otherwise).
9. Idempotency: send the same request twice with the same `idempotencyKey`; expect one order and the same hosted-page URL.
10. Record results (date, card used, order number, outcome) in this section. Until then, the items above stay NOT TESTED.

### Operational notes

- Stripe requires `expires_at` at least 30 minutes ahead; the code uses 31 minutes. Reservations last 36 minutes so the expiry webhook normally arrives first.
- Stripe metadata carries only `orderId` and `orderNumber`. Customer details are never sent in metadata.
- Schedule `GET /api/checkout/expire` (for example every 5 minutes) with `CRON_SECRET`. Checkout also opportunistically sweeps expired reservations on each request.
- A repeated request with the same idempotency key returns the existing open session but cannot return the access token again (only its hash is stored); the token still arrives in the `success_url` redirect.

## Webhooks

Status: **NOT TESTED against real Stripe** (no test key or webhook secret was available). Everything below was verified only with signed fixtures (`stripe.webhooks.generateTestHeaderString`) and mocked clients against the disposable local Postgres.

`POST /api/webhooks/stripe` (raw body, `stripe-signature`): 503 if the secret or a permitted key is missing; 400 generic body for a missing/invalid signature; 200 for processed, ignored, flagged or duplicate events; 409 if another worker holds the event; 500 on handler failure (PaymentEvent marked FAILED, Stripe retries).

Verified behaviour:
- Paid only when `payment_status === "paid"`, session id equals `order.stripeSessionId`, currency `aud`, `amount_total == totalCents`, `livemode` false (unless `STRIPE_ALLOW_LIVE`, never set in this mission) and `event.account` matches the pinned authorised account when provided; checkout and signed webhooks retrieve the configured key account and require `acct_1USJ2G7k4A7HyNzJ` plus test mode before payment operations. Alternate account configuration is rejected. On success, in one transaction: PAID, `paidAt`, `amountPaidCents`, `RECEIVED`, `commitReservation`, audit row (`stripe-webhook`).
- Mismatches never mark PAID: PaymentEvent FAILED with the reason code, `PAYMENT_FLAGGED` audit, 200.
- Completed-but-unpaid waits; async failure -> FAILED/CANCELLED/released; expired -> EXPIRED/CANCELLED/released; `payment_intent.payment_failed` -> FAILED only (no stock release); `charge.refunded` -> `refundedCents`, PARTIALLY_REFUNDED/REFUNDED. PAID is never downgraded.
- Late payment after automatic expiry: stock is re-claimed only if free (order revived to RECEIVED); explicit admin/customer or unclassified cancellations remain CANCELLED, record PAID plus NEEDS_REVIEW, preserve stock, and suppress confirmation even on later success events; on shortfall it is PAID with `NEEDS_REVIEW` (PaymentEvent.lastError + `PAYMENT_NEEDS_REVIEW` audit), no stock deducted, no customer email.
- Duplicates and concurrent deliveries commit stock and send email once. Email failures never fail the webhook and are retried by a later event or admin resend.

Manual steps once a test key exists: set `STRIPE_SECRET_KEY` (sk_test_) and `STRIPE_EXPECTED_ACCOUNT=acct_1USJ2G7k4A7HyNzJ`; run `npx tsx scripts/stripe-verify-account.ts` (prints account id and mode only); `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and put the printed `whsec_` in `STRIPE_WEBHOOK_SECRET`; pay with `4242 4242 4242 4242` and expect PAID, stock down once; `stripe events resend <evt_id>` expects `duplicate:true`; decline card `4000 0000 0000 0002` expects FAILED with stock still reserved; `stripe checkout sessions expire <cs_id>` expects EXPIRED/CANCELLED and release.


## Codex payment hardening continuation

- Payment stock reconciliation is all or nothing: a transaction savepoint rolls back every stock and reservation change if any line has a shortfall. The verified payment remains PAID, fulfilment remains blocked, and PAYMENT_NEEDS_REVIEW records the exception.
- Checkout persistence locks products and rechecks approved price, selling unit, tax category and quantity cap before creating the order. Raw inventory changes advance updatedAt for concurrent admin guards.
- Idempotency replay binds customer identity, address, notes, delivery date, fulfilment branch and cart. Changed payloads cannot recover another order hosted checkout URL.
- Order row locks serialize payment, expiry and admin cancellation. Refund updates serialize and reject invalid currency or cumulative amounts above the paid total.
- Error persistence keeps error class and Prisma code only, except allowlisted internal transient errors; provider messages are omitted.
- Duplicate successful webhook delivery can retry unsent confirmation emails while preserving event and stock idempotency.
- Executed local targeted tests: 65 passed before the final additional regression cases; final full-suite evidence is recorded in RELEASE_HANDOFF.md. No real Stripe API, payment or refund was exercised.
