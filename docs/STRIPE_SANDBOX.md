# Fresh Stop — Stripe sandbox integration

Scope: test-only Stripe account acct_1USJ2G7k4A7HyNzJ. No production deployment, no live charges and no changes to retired purchase APIs.

## Architecture

- /shop: sandbox-only product list, client-side basket, customer details and Australian delivery postcode.
- POST /api/stripe/checkout: validates input and origin, enforces rate limits, reloads trusted published product prices/units and branch availability from the database, applies reviewed delivery-zone minimum and fees, creates an unpaid order, then creates a Stripe-hosted Checkout Session in AUD. No card details handled by our server.
- POST /api/stripe/webhook: verifies raw body Stripe HMAC signature and 5-minute timestamp tolerance, checks test-only event, deduplicates event IDs in a database transaction, confirms order ID, checkout session, AUD currency and actual amount. Payment-success webhooks alone change a pending order to PAID and RECEIVED. Handles expiry, async failure and refunds.
- POST /api/admin/stripe/invoices: protected by existing Basic Auth and preview read-only guards, rate-limited and same-origin checked. Creates wholesale test customers, draft AUD invoices and line items with idempotency keys. Does not finalize or send automatically. Staff review, finalize and send using the Stripe test Dashboard; Stripe Dashboard is the invoice source of truth. Invoice webhooks are logged to the event ledger.
- Prisma: optional Stripe references on the existing Order model, plus StripeWebhookEvent replay-protection model. Additive changes only.
- Uses Stripe HTTPS REST API and native Node crypto; no SDK dependency or package-lock changes. Publishable key is not required for hosted Checkout.

## Owner approvals / known limitations

1. Rotate the sk_test secret pasted in chat. Add the replacement privately in an ignored .env.local or to a Preview-only environment. Never paste secrets in commits, public files, chat or logs.
2. Use a separate disposable integration PostgreSQL database. Review/backup first, then apply Prisma schema to **only the isolated test database**, not Production. Do not seed or reset production.
3. Verify actual product prices, units, stock by dispatch branch and delivery zones/fees/minimums. Never infer grocery prices from market averages or AI photos. Products missing price, unit or inventory cannot be ordered.
4. Have owner/accountant review GST treatment: many basic grocery items are GST-free, others taxable. THIS SCAFFOLD DOES NOT AUTOMATICALLY CALCULATE OR REMIT GST. Tax approval flag is a TEST ONLY gate and does not establish legal compliance.
5. Review customer confirmation emails, refunds, substitutions, stock adjustments, delivery fulfillment, privacy and retention, and accounting reconciliation before any future live implementation.
6. No production merge or deployment without express further authorization. Code is intentionally hard-blocked in Vercel Production and non-preview production runtimes.

## Private .env.local / Preview configuration

See .env.example for complete list and no-secret placeholders.

- STRIPE_SANDBOX_ENABLED=true
- STRIPE_TEST_ACCOUNT_ID=acct_1USJ2G7k4A7HyNzJ
- STRIPE_TEST_SECRET_KEY=(replacement test secret, set privately)
- STRIPE_TEST_WEBHOOK_SECRET=(test webhook whsec, set privately)
- STRIPE_CHECKOUT_RETURN_ORIGIN=http://localhost:3000 (or exact HTTPS Preview origin)
- STRIPE_PRICING_APPROVED=true (only after confirming test database prices)
- STRIPE_DELIVERY_RULES_APPROVED=true (only after verifying postcode/fees/minimums)
- STRIPE_TAX_REVIEWED=true (only after owner reviews test tax handling)
- STRIPE_INVOICING_ENABLED=true (test invoice drafts only)
- UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (existing protected limiter)
- DATABASE_URL, DATABASE_URL_UNPOOLED for **isolated test DB only** and ADMIN_PASSWORD private.

Enable only relevant test webhook event types for /api/stripe/webhook:
checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, charge.refunded, invoice.paid, invoice.payment_failed.

Signing secret is specific to that webhook endpoint. Local forwarding can be done via official Stripe CLI. Never configure live webhook traffic on this test endpoint.

## Verification commands (on branch)

    npm ci
    npx prisma generate
    npm run typecheck
    npm run lint
    npm test
    $env:CATALOGUE_DATA_SOURCE = "reviewed-snapshot"
    npm run build

## End-to-end sandbox test checklist

1. Checkout remains inaccessible unless flags + preview/local runtime allow it.
2. DB-backed shop contains only priced products with valid unit and positive branch availability.
3. Cart server rejects unknown/unpublished products, forged totals, duplicate IDs, fractional/invalid prices, unavailable inventory, unsupported postcode and minimum order failures.
4. Use a separate test DB and valid owner-reviewed delivery zone. Pay through official Stripe test Checkout (for example Stripe 4242 4242 4242 4242 test card, any future expiry/CVC).
5. Confirm order is PENDING before webhook and PAID/RECEIVED only after a genuine signed paid event.
6. Replay identical event ID; verify ledger dedup and no repeat fulfillment. Test bad signature, old timestamp, wrong amount or wrong currency (fail closed).
7. Test payment expiry, async payment failure, full/partial refunds and error recoveries.
8. Create test draft invoice using protected admin route; review the amount, descriptions and GST handling in Stripe Dashboard before finalizing or sending. Retry with same requestId for idempotency.
9. Confirm correct order amounts and audit logs. No live keys, customer notifications or production deployment.

## Test invoice JSON body example

    {
      "requestId": "11111111-1111-4111-8111-111111111111",
      "customerName": "Test Wholesale Customer",
      "customerEmail": "test@example.com",
      "daysUntilDue": 14,
      "taxTreatmentConfirmed": true,
      "items": [
        {"description": "Test produce box (tax review required)", "quantity": 2, "unitAmountCents": 2500}
      ]
    }

Note: Stripe Dashboard retains invoice state; this first branch does not add an invoice management UI or bookkeeping sync. Order confirmation email is also a release blocker. No sensitive key values were committed.
