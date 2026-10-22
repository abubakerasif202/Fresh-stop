# Fresh Stop Stripe integration TODO

## Approved website release continuation — 22 October 2026

Website push/deployment is authorised; another generic release approval is not required. Payment activation remains separate. The build-time homepage/stores dependency is fixed by request-time rendering, with real database reads preserved. A production build passed with an intentionally unreachable database. The new Preview `dpl_8cFLFg37iyAtqTmUFkDhdMjWyQ85` reached READY, but authenticated runtime checks failed (`/` and `/stores` 500, `/api/products` 503). Logs still show the shared pooler unreachable on port 6543. Preview checkout is disabled; contact metadata/phone/WhatsApp/footer checks pass and unauthenticated admin returns 401. READY is not runtime readiness.

Authenticated production schema verification is now complete: only the two new tax approval columns are missing compared with Prisma scalar fields; existing types match. The database uses Supabase's historical commerce bridge and has no Prisma history table. Read [the additive migration procedure](docs/PRODUCTION_TAX_MIGRATION.md); never replay the initial/historical Prisma migrations. The exact four migrations passed against a dumped/restored synthetic local reconstruction of that bridge, preserving all 172 fixture rows and RLS. No production migration was applied.

Remaining website gates: privately configure and verify an authorised isolated Preview database, make its runtime checks pass, verify a current recoverable production backup, then apply/check the reviewed additive migration before merge/deployment. Existing protected database variables are present in Vercel; their unavailable local exports are not evidence of absent variables. Provider/commercial payment gates below remain unchanged and checkout stays closed.

## Current continuation status — 21 October 2026

This section supersedes older completion estimates and stale checklist rows below. Work is continuing on PR #14; no merge, deployment, production migration, or payment activation was performed.

- **PASS (local engineering):** owner tax classification workflow added to `/admin/pricing`, with per-product category selection, exact typed confirmation, authenticated audit actor/time, revoke-with-reason, unresolved-tax filter, and CSV review fields. Checkout, cart refresh, and public catalogue now fail closed without a supported, explicitly approved category and approval timestamp. Four additive migrations introduce nullable approval fields and database integrity checks; applied only to the disposable local DB.
- **PASS (source):** AB Web Studio footer commits are on the branch. Developer credit links to `https://www.abwebstudio.com.au/`; the existing supplied mark is displayed with a visible AB Web Studio text label.
- **PASS (read-only production audit):** 172 products; 0 owner-approved selling prices/purchasable products/verified stock; 161 missing units; all 172 existing tax labels lack owner approval. Two active delivery zones remain unapproved and without fees/minimums/schedule. No commercial production data was changed.
- **BLOCKED (provider):** no verified authenticated Live account, rotated private Stripe keys, authenticated Fresh Stop Stripe CLI, real sandbox card transaction, authentic signed-provider webhook, Resend delivery, or scheduler execution. The local Stripe CLI is authenticated to an unrelated Maple Rentals account and expired; it was not used.
- **BLOCKED (hosting):** production checkout remains disabled and production canonical HTML still names the Vercel alias. Current deployed site has not been replaced by this PR. Latest Preview build failed at database access to the Supabase pooler (`aws-0-ap-southeast-2.pooler.supabase.com:6543`); this is not proof of a code failure or a successful deployment.
- **BLOCKED (owner decisions):** prices, units, GST treatment, physical counts, delivery fees/minimums/schedules, pickup policies, and payment activation require explicit owner review. Existing `/admin/pricing`, `/admin/products`, and `/admin/delivery` workflows are used; nothing is bulk-approved.

Final local commands and counts are recorded in [release handoff](docs/FRESH_STOP_RELEASE_HANDOFF.md) after completion. All payment gates remain off.

## Release status: BLOCKED

Single source of truth for remaining setup. No merge, production activation/deployment, migration or real charge is authorised. Live Mode activation by the owner is acknowledged, but authenticated Stripe access currently exposes only test accounts. Live identity is not verified.

## Continuation evidence — 21 October 2026, 01:11 UTC

- **PASS:** resumed the same PR #14 branch without changing payment application code or repeating the completed 389-test baseline.
- **PASS:** production metadata rechecked. Disabled checkout/live flags were explicitly staged and read back closed; `STRIPE_MODE` staged as test, www origin staged and verified, and missing `ORDER_ACCESS_SECRET` generated directly into sensitive Vercel storage without displaying or writing its value to disk. Existing legacy `ORDER_TOKEN_SECRET` remains untouched.
- **PASS:** Resend confirms `freshstop.com.au` verified and sending enabled. Existing project sender and published merchant recipient are staged; no email sent. Resend API key and scheduler configuration remain missing.
- **PASS:** production branch phone fields corrected on exactly two rows. Live calls/WhatsApp on five checked public routes and both store schema phones now use the sole authorised number. Prices, stock, approvals and orders were not changed.
- **BLOCKED:** www is verified and owner-approved, but current deployed HTML still declares the Vercel URL canonical. Correct source and staged environment await an authorised deployment.
- **PASS / partial:** real sandbox API accepted one isolated AUD500-cent hosted Session, with order references and configured settings. It remains unpaid; no payment or fulfillment was triggered. This is contract proof, not full application/card/webhook proof. See [webhook report](docs/STRIPE_WEBHOOK_TEST_REPORT.md).
- **BLOCKED:** actual live identity still unavailable through the connector. Existing CLI credentials are expired. A dedicated restricted key pasted into chat was not used or copied; rotate it and enter the replacement privately using [secure setup](docs/STRIPE_SECRET_SETUP.md).
- **BLOCKED:** production audit confirms 172 unapproved/unpurchasable/unverified-stock products, zero positive integer selling prices, 161 missing selling units, and two unapproved zones without integer-cent fees. All 172 stored tax categories are GST_FREE, which is not evidence of owner-approved tax classification.

## Values to Replace

No placeholders in the Checkout call: server-generated AUD `price_data`, application URLs and one-time `payment` mode are retained. Configure [`.env.example`](.env.example) privately: replace example credentials/database URLs, verify the live account, configure email and strong tracking/scheduler secrets. Never commit keys. No Stripe catalogue duplication is required.

## Configured Parameters

Files: [checkout-service.ts](src/lib/checkout-service.ts), [checkout-stripe.ts](src/lib/checkout-stripe.ts).

| Parameter | Value |
| --- | --- |
| ui_mode | hosted_page, SDK 23.0.0 |
| mode / currency | payment / aud |
| billing_address_collection | auto |
| automatic_tax.enabled | false |
| phone_number_collection.enabled | false |
| allow_promotion_codes | false |
| submit_type | auto |
| integration_identifier | hosted_web_0001 |
| origin_context | web |

`payment_method_collection` is omitted for one-time purchases. All order references, both metadata objects, customer email, expiry, line items, URLs and request idempotency remain intact. Installed SDK types and Stripe documentation support these settings. API pin is unchanged.

## Setup and Next Steps

1. Connect Fresh Stop's intended account in authenticated Live Mode, confirm its ID with the owner, then verify the privately supplied production key retrieves that exact account. Neither existing ID is assumed live. Rotate previously exposed keys privately.
2. Supply remaining private Stripe, signing, Resend and scheduler configuration. The production tracking-secret name mismatch has been resolved by staging a new sensitive `ORDER_ACCESS_SECRET`; Preview still needs its own secret. See [secure setup](docs/STRIPE_SECRET_SETUP.md) and the [presence checklist](docs/STRIPE_LIVE_READINESS.md). Keep payment gates disabled; Preview/development require separate test keys and signing secrets.
3. Owner-confirmed canonical: `https://www.freshstop.com.au`. The production origin is now staged accordingly; verify rendered HTML at the approved release. Verify/create `https://www.freshstop.com.au/api/webhooks/stripe` on the verified live account, subscribing to the six events in the [webhook report](docs/STRIPE_WEBHOOK_TEST_REPORT.md), with its own signing secret. No live destination was created here.
4. Approve actual selling units/AUD prices, GST classifications, counted stock, active pickup branches and delivery zones/fees/minimums in existing admin. The authenticated production audit above now confirms the unapproved state; no indicative value was approved or activated.
5. Complete actual sandbox application/card/redirect/provider-signed webhook tests using an isolated database. Verify approved Resend customer/owner delivery and authenticated expiry/retry scheduling. Local signatures and mocks are not provider proof. Test card `4242 4242 4242 4242`, future expiry, three-digit CVC is for Stripe test mode ONLY.
6. Failure/cancellation/refund email workflows are not implemented. Confirm approved messaging/requirements before claiming these notifications. Paid confirmation and merchant alerts already support independent idempotent retries.
7. Resolve all [release gates](docs/FRESH_STOP_RELEASE_HANDOFF.md), rerun final checks, then obtain explicit final merge/activation/production-deployment approval. Real charges require separate authorisation.

## Flow and failure recovery

Same-origin JSON + required request key -> server pricing/approval/stock/fulfillment validation -> transactional pending order/reservation -> hosted Checkout -> signed verified paid event -> inventory/payment reconciliation -> independent email delivery. Success URLs never mark an order paid.

Uncertain provider responses retain pending reservations. Same-key retry performs bounded read-only recovery of up to 300 recent Sessions; only a unique immutable-reference/AUD/amount match is attached. Ambiguous, truncated, mismatched or unavailable results fail closed for admin review and never create a second Session. Completed Sessions await webhooks; expiry sweeps run before replay. Check Stripe before manually restarting or fulfilling unresolved orders.

## Evidence and current files

See [live readiness](docs/STRIPE_LIVE_READINESS.md), [webhook tests](docs/STRIPE_WEBHOOK_TEST_REPORT.md), [admin guide](docs/ADMIN_GUIDE.md), and [release handoff](docs/FRESH_STOP_RELEASE_HANDOFF.md). Existing routes/datastore/admin are reused; no runtime dependency was added. Four additive migrations are present and have only been applied to the disposable local database.

Only business phone: `0423 936 586`, `tel:+61423936586`, WhatsApp `https://wa.me/61423936586`. Public store/schema/shared contact/baseline/seed updated; customer numbers unchanged.

Resources: https://support.stripe.com and https://docs.stripe.com/mcp
