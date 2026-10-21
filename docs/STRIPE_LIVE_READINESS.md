# Stripe live readiness — 21 October 2026

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
