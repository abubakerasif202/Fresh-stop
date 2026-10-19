# Production readiness — 20 October 2026

Production activation is blocked pending the business and infrastructure gates below. A successful local build is not a deployment or proof of external integration delivery.

## Required private configuration

Use `.env.example` as the configuration inventory. Configure pooled `DATABASE_URL` and direct `DATABASE_URL_UNPOOLED`; strong `ADMIN_USER`/`ADMIN_PASSWORD`; shared HTTPS Upstash Redis URL/token; canonical `NEXT_PUBLIC_SITE_URL`; fresh Stripe sandbox key and webhook signing secret; `STRIPE_EXPECTED_ACCOUNT=acct_1USJ2G7k4A7HyNzJ`; Resend API key and verified sender/merchant recipient; random `ORDER_ACCESS_SECRET` of at least 32 bytes; and a random `CRON_SECRET`.

Keep `PAID_CHECKOUT_ENABLED=false` and database `paidCheckoutApproved` off until approval. Production rate limits fail closed if Redis is absent or unhealthy. The implementation pins the authorized sandbox; live activation requires a separately reviewed code/configuration change, not an environment toggle.

Never reuse the exposed Stripe credential. No newly issued credential with verified provenance was supplied for this continuation, so external Stripe verification remains blocked. The unrelated connected Stripe account must not be used.

## Scheduler and retries

An approved scheduler must call `GET /api/checkout/expire` with `Authorization: Bearer <CRON_SECRET>` every five minutes. It releases expired reservations and retries a bounded batch of eligible paid-order emails. Missing secret fails closed; send failures return 503 for monitoring/retry. Stripe signed expiry events and checkout traffic also release expired reservations. Late paid events reconcile inventory and preserve paid orders for review on shortfall.

No scheduler has been provisioned or authorized here. Vercel Hobby supports only one invocation per day with hourly precision, so it cannot provide the five-minute service requirement. Use an approved external HTTPS scheduler or an approved Vercel plan supporting the interval. Current account plan is unverified. Do not silently install a five-minute Hobby cron. Sources: [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

Email retries use five-minute leases and stable provider idempotency keys. Provider deduplication has a finite retention window; monitor failures and reconcile provider delivery before a delayed manual resend. Cancelled or inventory-held orders do not receive normal fulfilment confirmations. Tracking links expire after 30 days; authorized admin resend reissues them.

## Database release

Follow DATABASE_MIGRATION.md. Identify the actual production project, take a private backup and verify restore before any separately approved migration. Four additive/baseline migrations exist, including recoverable email claims and link issuance time. Never run a reset or catalogue seed on production. Local rollback SQL is not permission to discard real orders.

## Business release

Approve real selling prices and correct units, confirm GST treatment, verify counted stock, approve configured delivery, resolve payment-review orders, verify sender and sandbox end-to-end behavior, then obtain explicit production and payment approval. All 172 source products currently remain pending and unavailable to paid checkout.
