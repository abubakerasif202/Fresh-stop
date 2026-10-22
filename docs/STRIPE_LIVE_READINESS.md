# Stripe live readiness — 21 October 2026

## Approved website release evidence — 22 October 2026

The website release is approved, but merge/production deployment remains technically blocked. `265daac81135ff642472e3c376a37a37f4ef749e` removes build-time catalogue/store reads by making `/` and `/stores` request-rendered. A local production build passed without a reachable database. Preview `dpl_8cFLFg37iyAtqTmUFkDhdMjWyQ85` is READY; actual authenticated runtime responses are `/` 500, `/stores` 500, `/api/products` 503, checkout status 200/disabled, contact 200 and unauthenticated admin 401. Runtime logs confirm the existing Preview connection still cannot reach `aws-0-ap-southeast-2.pooler.supabase.com:6543`.

Production's database is healthy and its current products API returns 200. Both Production and Preview database variable entries exist and are protected; CLI `env run` cannot export them. Preview has no verified isolated Supabase branch. Older integration host metadata refers to a different, inaccessible project; this is a configuration inconsistency to resolve, not proof of what the protected override contains. No host, password or project identifier was guessed or substituted.

The production schema is now authenticated read-only evidence: only the two tax approval columns are missing from the generated Prisma scalar shape; other scalar types match. Supabase history contains the original schema, unpriced-products update and commerce bridge; there is no Prisma history table. The reviewed [migration procedure](PRODUCTION_TAX_MIGRATION.md) and [read-only preflight](../scripts/tax-approval-preflight.sql) preserve that bridge. A current recoverable production backup and passing isolated Preview remain required before applying the four additive migrations. Production remains unchanged and checkout-disabled.

## Current verification — 21 October 2026

**BLOCKED.** This supersedes older staged-environment claims below where they differ. The production checkout-status endpoint currently returns `enabled:false`; `STRIPE_MODE=test`, `STRIPE_ALLOW_LIVE=false`, and `PAID_CHECKOUT_ENABLED=false` were confirmed through safe production environment checks. No production deployment or environment activation occurred in this continuation.

Read-only production catalogue audit: 172 products; 0 positive approved prices, 0 purchasable, 0 verified stock; 161 missing units; all 172 existing tax labels have no approval metadata. Two active delivery zones have no approval, fee, minimum, or delivery schedule. Database payment approval is false. No product/order/stock/zone data was changed.

Production HTML still declares `https://fresh-stop.vercel.app` canonical. Source and intended production origin are `https://www.freshstop.com.au`, but the public canonical changes are **not deployed**. Current Preview builds fail while connecting to the Supabase pooler on port 6543; database access must be repaired for Preview before treating deployment validation as passing.

This branch now has four additive tax-approval migrations; they have been applied only to the disposable local database. Do not run them on production until a reviewed release migration is approved and a verified backup/release procedure is available. Stripe identity, live credentials, provider-signed webhook, transactional email delivery and scheduler remain blocked. See [handoff](FRESH_STOP_RELEASE_HANDOFF.md).

**BLOCKED for production.** Remaining setup: [integration TODO](../STRIPE_INTEGRATION_TODO.md).

## Authenticated account evidence

| ID | Connector name | Available mode |
| --- | --- | --- |
| acct_1USJ2G7k4A7HyNzJ | Fresh Stop sandbox | test |
| acct_1USJ246bUDM9kb4q | Fresh Stop | test |

**Live account NOT VERIFIED.** Neither ID is authorised as live by this report. Sandbox webhook listing returned zero endpoints; no live destination/signing delivery is verified. No Stripe mutation or payment was performed.

Live runtime requires `STRIPE_MODE=live`, `STRIPE_ALLOW_LIVE=true`, Vercel `VERCEL_ENV=production`, explicit expected account other than the known sandbox, matching live key and authenticated account comparison. Test/live mismatches and live Preview/development configurations are rejected. Keys alone never enable checkout: environment and database gates, demo block and product/fulfillment approval remain required.

SDK 23.0.0; preserved API pin `2026-09-30.endive`. Existing read-only verifier: securely inject environment and run `node --env-file=.env.local --import tsx scripts/stripe-verify-account.ts`. Only ID/mode/match are printed. Avoid putting production secrets on shared development machines.

## Vercel environment metadata

Project `fresh-stop`, `prj_VHcFHxX5ym4XfPQ2KUijnBZ0hTMg`; team `team_cJFk6APDaky0rXTTZLj4xoWT`. Metadata read without decrypting secrets. Presence does not establish valid values.

| Variable | Production | Preview |
| --- | --- | --- |
| STRIPE_SECRET_KEY | MISSING | MISSING |
| STRIPE_WEBHOOK_SECRET | MISSING | MISSING |
| STRIPE_MODE | PRESENT, staged test | MISSING |
| STRIPE_EXPECTED_ACCOUNT | PRESENT | MISSING |
| STRIPE_ALLOW_LIVE | PRESENT | MISSING |
| PAID_CHECKOUT_ENABLED | PRESENT | old hardening branch override only |
| NEXT_PUBLIC_STOREFRONT_DEMO | PRESENT | old hardening branch override only |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | MISSING | MISSING |
| NEXT_PUBLIC_SITE_URL | PRESENT | MISSING |
| DATABASE_URL / DATABASE_URL_UNPOOLED | PRESENT | PRESENT |
| ORDER_ACCESS_SECRET | PRESENT, newly generated sensitive | MISSING |
| ORDER_TOKEN_SECRET (unused by current signer) | PRESENT | PRESENT |
| RESEND_API_KEY | MISSING | MISSING |
| RESEND_FROM_EMAIL | PRESENT, staged | MISSING |
| ORDERS_NOTIFICATION_EMAIL | PRESENT, staged | MISSING |
| CRON_SECRET | MISSING | MISSING |
| UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN | PRESENT | PRESENT |
| ADMIN_PASSWORD | PRESENT | PRESENT |

Hosted redirect currently does not consume the publishable key; match its mode if subsequently used. Secret variables remain server-only. Integration-managed Supabase/database aliases also exist; none changed or decrypted. Vercel metadata flags several integration-managed secrets as readable-secret: review access privately and rotate previously exposed credentials. No secret value was retrieved.

## Domain and current production

Owner confirmed `https://www.freshstop.com.au` canonical. Vercel verifies www, apex (308 redirect to www) and `fresh-stop.vercel.app`. HTTP: both homepages 200; apex resolves to www. Current live HTML still declares the Vercel URL canonical; source default/template now use www, production environment correction awaits release.

`GET https://www.freshstop.com.au/api/checkout/status`: 200, `enabled:false`, reverified during continuation. This proves disabled state only. Vercel SSO protection remains `all_except_custom_domains`, with no bypass. Initial project metadata showed an ERROR preview, separate from current production. Continuation safely staged disabled flags, explicit test mode, confirmed www origin, a new sensitive tracking secret and existing email sender/recipient configuration. Read-back confirmed both flags closed and the staged origin matches www. No deployment occurred, so current canonical HTML still uses the Vercel alias.

## Business and operational readiness

Authenticated production audit on project `asjjjivkmugbcruzdhju`: 172 products; zero APPROVED, purchasable, stock-verified, positive-price or price-approver rows; 161 missing selling units; zero negative stock/reservation values. Tax categories: 172 GST_FREE, with classification approval unverified. Two active branches; two active zones, neither approved nor configured with integer-cent fees. Both zones reference active branches. Checkout approval false; no pickup-minimum setting, orders, payment events or inventory reservations. No commercial setting changed. Owner must verify units/prices, stock, tax and fulfillment before any activation.

Both StoreBranch phone fields were conditionally changed from the two legacy landlines to the authorised international number. Verification confirmed exactly two corrected branches and unchanged zero commercial approvals/orders. After cache refresh, live call/WhatsApp links on `/`, `/contact`, `/stores`, `/wholesale`, `/home-delivery` all use the correct digits; both store JSON-LD telephone fields match. No application deployment was required for this data correction. Shared source email templates use CONTACT.phoneDisplay; actual email delivery is still unverified.

Existing admin supports product/stock approval, delivery settings, orders, masked transaction references, reconciliation/audit history, statuses and recorded refunds. Server uses positive integer AUD cents, explicit tax categories and existing inclusive GST calculation, counted/available stock and actual active branches. No business values invented. Only public phone: 0423 936 586.

Paid emails use existing Resend independent leases/provider idempotency. Retry runs in the authenticated expiry sweep. Authenticated Resend metadata confirms `freshstop.com.au` verified with sending enabled; existing project sender and published merchant recipient were staged, without sending messages. API key, real delivery and scheduling remain blocked. Failure/cancellation/refund notifications have no existing implementation and are not claimed complete.

Supabase security advisor: all 14 public tables have RLS enabled; only INFO notices for no policies, consistent with this server-only Prisma access model. No policy/grant/authentication changes made. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Update — 23 October 2026
Production runs `main` (`adeb28b`) with owner-approved checkout enabled (`/api/checkout/status` → `{"enabled":true}`). Re-verified: local tests 396/396, build PASS, unsigned webhook → 400, empty checkout → field validation. Still unobserved: a completed payment, provider-signed webhook delivery, Resend delivery, expiry scheduler. Recommended before promoting the site: one Stripe test-mode run on an isolated Preview, and one owner-supervised smallest-value live order with an immediate refund.
