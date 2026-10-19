# Fresh Stop release handoff — 20 October 2026

## Public owner-presentation release

This release supersedes the initial checkpoint below. Public target: **https://fresh-stop.vercel.app**, existing Vercel project `prj_VHcFHxX5ym4XfPQ2KUijnBZ0hTMg`. The feature branch incorporates current main's illustration assets and verified deployment fixes.

The storefront shows all 172 products and separate indicative AUD prices/units: 21 observed retailer product-type/size references and 151 labelled estimates. Owner-approved prices, then explicit ADMIN_DRAFT edits, override registry display amounts. The cart and order preview work without creating orders, reserving stock or requesting payment. CSV draft-price import/export is authenticated, confirmed and audited. See [client handoff and payment-request draft](CLIENT_HANDOFF.md).

Production configuration is `NEXT_PUBLIC_STOREFRONT_DEMO=true`, `PAID_CHECKOUT_ENABLED=false`, `CATALOGUE_DATA_SOURCE=database`, authorized sandbox account pinned, live Stripe disabled. Server DEMO_MODE closes checkout even if other payment approvals are enabled. No Stripe key is installed for this launch; actual provider Checkout/webhook/refund verification remains blocked.

Verified live Supabase database: `asjjjivkmugbcruzdhju`, not the stale integration alias. Its private six-table backup was restored with exact data verification before the reviewed additive bridge was applied. Post-apply: all original values unchanged, 186 matching schema columns, 14 RLS tables, no public API grants on eight new tables, 172 PENDING/non-purchasable products, zero verified stock/orders/payment events/reservations. [Bridge evidence](evidence/PRODUCTION_DB_BRIDGE_20261020.md) explains history reconciliation; do not replay Prisma 0_init against production.

Current local gates: 360 automated tests PASS, no skips; typecheck, ESLint, schema validation/local migration status, production build and production dependency audit PASS. Local browser runs use the built production app with a clearly labelled local Redis protocol mock; actual deployed Redis/admin protection is checked separately on the real public URL. Final browser/live results and deployment/source identifiers are recorded in the delivery report and ignored local release record. Real payment/email integration is not claimed.

Rollback candidate captured before release: `dpl_D1e4agr2Ye2Mbc1tQWK5VZWY9RuQ` (`fresh-stop-l8pogzzk9-abubakerasif202s-projects.vercel.app`). The prior application remains compatible with the additive bridge. An approved application rollback must preserve the new database schema/data and keep payment gates closed; do not run a destructive SQL rollback.

## Initial engineering checkpoint (historical)

Branch: `feat/fresh-stop-ecommerce-final-hardening`. Recovery base: `631619f`. The final local commit is reported in the delivery response; use `git log -1` for its full identifier. No push, merge, deployment, production migration, live email or real payment was performed.

## Scope and changes

Installed versions verified with `npm ls --depth=0`: Next.js 15.5.28, React/React DOM 19.3.1, TypeScript 5.9.3, Tailwind 4.3.3, Prisma/client 5.22.0, Stripe SDK 23.0.0 and Resend 6.34.1. No dependencies were added or upgraded during this continuation.

The inherited uncommitted checkout, webhook, inventory, cart and admin implementation has been integrated. Continuation corrections include pinned Stripe identity; explicit-cancellation reconciliation; product/fee/stock transaction locks; full checkout idempotency binding; safe payment/admin logs; expiring email access; recoverable notification claims; stale delivery responses and availability timeouts; and approval revocation on changed selling units/prices.

Important source groups: `src/lib/checkout-*`, `inventory.ts`, `payment-*`, `stripe.ts`, `order-*`, `email.ts`, `admin-*`, `src/app/api/admin`, `src/app/api/webhooks/stripe`, `src/components/cart`, `src/components/checkout`, storefront/admin pages, Prisma schema/migrations and test scripts. The commit contains the complete file list (`git show --stat HEAD`).

## Verified source catalogue

172 unique products; 0 approved selling prices; 172 pending; 0 verified stock; 0 purchasable (172 unavailable for paid checkout). 16 market observations, 172 estimate rows, 35 product-review flags and 51 GST classification review flags. These are repository source counts, not a remote database inventory report. No estimates were approved, costs invented, or stock manufactured.

## Quality evidence

- Prisma schema validation, full client generation and local migration status: PASS, four migrations current.
- TypeScript and ESLint: PASS.
- Full sequential suite after the final application changes: 344 PASS, zero failures/skips on each of two consecutive runs. Tests use only `localhost:54329/fresh_stop_dev` and reject a remote direct URL or another local database.
- Production build: PASS with explicit local database and Stripe/Resend cleared. Compilation, type/lint and prerendering completed. An earlier engine-less generated-client failure was corrected by normal client regeneration.
- Independent code/security review: APPROVE after transaction, email and logging corrections.
- Production dependency audit: PASS, zero advisories. Full development audit: FAIL, five HIGH advisories in the unpatched braces/ESLint chain. No forced downgrade.
- Database-backed tests use real local PostgreSQL; Stripe/email clients and signed events are fixtures/mocks. They are not real provider integration tests.
- Local browser evidence: `artifacts/ui-qa/report.json` records 101/103 checks passing. The 30 storefront route/viewport combinations (320, 375, 768, 1024 and 1440 px), four 320 px axe scans, cart/quantity/keyboard behavior, checkout validation and mocked redirect, tracking-token flows, 17-route link crawl, and 14 admin route/viewport checks passed. Admin fixture price approval, delivery fee save/approval, payment-review visibility, and paid-checkout confirmation guard passed. The two failed checks are the final dev-server console scan: Next.js raised its `clientReferenceManifest` invariant while crawling `/products`, followed by HTTP 500 and a JSON parse error on `/orders`; the preceding 17-route crawl returned successfully. This remains a browser-runtime blocker, not a green full browser gate.
- A local production-server browser attempt was not considered valid release evidence: without configured shared Upstash Redis, production rate limiting correctly failed closed, preventing the real route/API workflow. The production dependency audit is separate from this runtime configuration blocker. No remote Redis credentials were used.
- Screenshots and `report.json` are local QA evidence under ignored/uncommitted `artifacts/ui-qa/`; the local TEST products/order/zone/branch/payment event were removed after the run and verified absent.

## Blockers and exact release procedure

1. Issue a fresh private sandbox credential for `acct_1USJ2G7k4A7HyNzJ`; do not reuse the exposed key or unrelated connector. Follow STRIPE_TESTING: identity check, actual hosted Checkout success/decline/3DS/expiry, signed webhook retries, refund events and payment/stock assertions. Record actual outcomes. Current real-provider status: BLOCKED.
2. Configure verified Resend sender and credentials, dedicated `ORDER_ACCESS_SECRET`, shared Redis and scheduler `CRON_SECRET`. Test email receipt/tracking and failed-send recovery with authorized test recipients. Provision an approved five-minute external scheduler or suitable Vercel plan; Hobby daily cron is insufficient. See PRODUCTION_READINESS.
3. Identify the actual production database and take a private backup; restore-verify it. Review existing schema/drift, baseline only where appropriate, then seek explicit approval before applying migrations. DATABASE_MIGRATION includes additive migrations and rollback. No production backup or remote state is claimed here.
4. Approve real product units/prices/GST, counted stock and supported delivery fees/minimums/postcodes in admin. Unsupported delivery-day/cutoff/capacity constraints cannot be approved. Resolve payment exceptions; acknowledgment alone never changes payment state.
5. Obtain preview authorization and isolated preview configuration. Keep paid gates off; do not point preview at live customer data. Build/deploy and verify actual preview behavior. No preview deployment occurred here.
6. Obtain production authorization separately. Apply approved migration and matching application release, verify security headers/admin/auth/routes/integrations, and retain payment gates off until business approval. The current implementation is sandbox-pinned; live Stripe requires a separately reviewed activation change.

## Rollback

Before release, capture matching application SHA, database backup and configuration privately. Disable paid gates first. Restore matching application/database only under an approved recovery plan that preserves new orders and reconciles provider payments. Do not reset a live database or run the historical destructive rollback against new transactions.

## Development environment

Local PostgreSQL runs on port 54329, database `fresh_stop_dev`. `scripts/db-local.mjs` manages it; `reset` is destructive and was not used during this continuation. A local backup restored to `fresh_stop_restore_codex_20261020`; see DATABASE_MIGRATION. All `.env.local` contents remain private and unchanged. Only credential-free templates are committed.
