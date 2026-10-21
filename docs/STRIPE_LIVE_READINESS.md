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
| STRIPE_MODE | MISSING | MISSING |
| STRIPE_EXPECTED_ACCOUNT | PRESENT | MISSING |
| STRIPE_ALLOW_LIVE | PRESENT | MISSING |
| PAID_CHECKOUT_ENABLED | PRESENT | old hardening branch override only |
| NEXT_PUBLIC_STOREFRONT_DEMO | PRESENT | old hardening branch override only |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | MISSING | MISSING |
| NEXT_PUBLIC_SITE_URL | PRESENT | MISSING |
| DATABASE_URL / DATABASE_URL_UNPOOLED | PRESENT | PRESENT |
| ORDER_ACCESS_SECRET | MISSING | MISSING |
| ORDER_TOKEN_SECRET (unused by current signer) | PRESENT | PRESENT |
| RESEND_API_KEY | MISSING | MISSING |
| RESEND_FROM_EMAIL | MISSING | MISSING |
| ORDERS_NOTIFICATION_EMAIL | MISSING | MISSING |
| CRON_SECRET | MISSING | MISSING |
| UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN | PRESENT | PRESENT |
| ADMIN_PASSWORD | PRESENT | PRESENT |

Hosted redirect currently does not consume the publishable key; match its mode if subsequently used. Secret variables remain server-only. Integration-managed Supabase/database aliases also exist; none changed or decrypted. Vercel metadata flags several integration-managed secrets as readable-secret: review access privately and rotate previously exposed credentials. No secret value was retrieved.

## Domain and current production

Owner confirmed `https://www.freshstop.com.au` canonical. Vercel verifies www, apex (308 redirect to www) and `fresh-stop.vercel.app`. HTTP: both homepages 200; apex resolves to www. Current live HTML still declares the Vercel URL canonical; source default/template now use www, production environment correction awaits release.

`GET https://www.freshstop.com.au/api/checkout/status`: 200, `enabled:false`. This proves disabled state only. Vercel SSO protection remains `all_except_custom_domains`, with no bypass. Latest project metadata showed an ERROR preview; this is separate from current production behavior. No production configuration changed.

## Business and operational readiness

Repository source pricing dataset: 172 rows, zero APPROVED, purchasable or stock-verified products. Smaller baseline: 11 products, also none approved/purchasable/stock-verified and zero approved zones. These are source counts, not remote inventory. Owner must verify live prices, stock, GST classification, fees/minimums and branch operations. Indicative estimates remain non-chargeable.

Existing admin supports product/stock approval, delivery settings, orders, masked transaction references, reconciliation/audit history, statuses and recorded refunds. Server uses positive integer AUD cents, explicit tax categories and existing inclusive GST calculation, counted/available stock and actual active branches. No business values invented. Only public phone: 0423 936 586.

Paid emails use existing Resend independent leases/provider idempotency. Retry runs in the authenticated expiry sweep. Provider sender/recipient, real delivery and scheduling remain unverified. Failure/cancellation/refund notifications have no existing implementation and are not claimed complete.
