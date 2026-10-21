# Private Stripe live configuration

## Current secret/configuration status — 21 October 2026

No secret value is reproduced here. Current production metadata is incomplete: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, and `CRON_SECRET` are absent. `ORDER_ACCESS_SECRET` is present; application code uses it and does not rely on `ORDER_TOKEN_SECRET`. Stripe mode is test, live opt-in is false, and paid checkout is false. Preview needs separate scoped configuration and a working database connection.

The local Stripe CLI session belongs to an unrelated Maple Rentals account and is expired; do not use it for Fresh Stop. A previously exposed credential must be revoked/rotated privately. To verify a fresh Live credential, the owner should open a trusted local PowerShell session in this checkout and run `pwsh -NoProfile -File .\scripts\configure-stripe-live.ps1`. Enter the rotated key only at the script's secure masked prompt; never paste it into chat, terminal command arguments, files, PR comments, or screenshots. The verifier must authenticate the intended Fresh Stop Live account and match its owner-confirmed account ID before any staging.

Keep Test, Preview, and Production values separate. Use the existing Vercel project and environment-scoped secret input; never fetch secret values into a local `.env` file. Keep `STRIPE_ALLOW_LIVE=false` and `PAID_CHECKOUT_ENABLED=false` until all commercial/provider gates pass and explicit payment activation is approved. The required webhook URL is `https://www.freshstop.com.au/api/webhooks/stripe` with the six events listed in [webhook report](STRIPE_WEBHOOK_TEST_REPORT.md).

Never reuse a key pasted into chat. Revoke that key in Stripe and create a replacement privately. The account ID must be confirmed by the owner in authenticated Stripe Live Mode; a test-mode account connection does not establish live ownership.

From a fresh, trusted PowerShell 7 session with no transcription, debugging, tracing, screen recording, or terminal logging:

```powershell
pwsh -NoProfile -File scripts/configure-stripe-live.ps1 -ExpectedAccountId acct_OWNER_CONFIRMED_ID
```

The script prompts for the rotated key using masked secure input. It performs read-only Stripe account verification, requiring the exact owner-supplied account ID, an AU account, AUD default currency, and charges enabled. The known sandbox account is rejected. No key is accepted through command arguments, written to a file, or displayed. Restricted keys need permission to retrieve the current account and, when supplied, webhook endpoints. Verification failure is fail-closed.

A dedicated Codex read-only key is suitable for the default verification step. It is not automatically a suitable application payment key. Use `-StoreInVercel` only with a separately approved application credential that has the permissions needed by the existing Checkout create/retrieve/list/expire and inline pricing flow. This verifier does not establish those write permissions; review the restriction settings privately and prove the corresponding sandbox application flow before activation.

Optionally verify an existing endpoint by adding `-WebhookEndpointId we_OWNER_CONFIRMED_ID`. Its live mode, canonical URL, status, API version, and required events must match. This does **not** verify its signing secret or successful signed delivery.

To stage credentials in the existing Vercel production environment, first authenticate Vercel CLI privately, then add `-StoreInVercel` explicitly. The helper targets the fixed Fresh Stop project/team and writes disabled checkout flags before staging a key. The optional endpoint flag prompts separately for its masked signing secret. Vercel receives JSON through stdin; CLI output is suppressed. No deployment occurs and `STRIPE_ALLOW_LIVE` remains `false`. Other required environment variables must still be audited.

If staging fails, inspect Vercel privately: earlier updates may have succeeded. Never enable either payment flag to troubleshoot. Existing deployed instances are unaffected until deployment; this helper cannot disable an already-running deployment.

PowerShell cannot reliably detect external session recording or every host-level trace. The helper refuses managed transcription and verbose/debug switches and stops an interactive transcript before requesting a secret. Use a fresh private shell; do not run it inside a logged automation session. Managed strings necessarily exist briefly in memory for HTTPS/CLI input; references are cleared and secure-input BSTR allocations are zeroed.

Continue with [STRIPE_INTEGRATION_TODO.md](../STRIPE_INTEGRATION_TODO.md). Account verification and secret staging alone do not authorise live Checkout. Signed live webhook delivery, commercial approvals, all release gates, and final owner approval remain required.

## Exact owner-access steps still required

1. Revoke/rotate the chat-exposed live key privately. Confirm the intended account ID in authenticated Stripe Live Mode; the connector currently exposes test mode only. Run the default read-only helper with that confirmed ID and the rotated key through its masked prompt. If a restricted key cannot retrieve the current account, grant only the required read permission or use an appropriately scoped replacement; never bypass the account comparison.
2. On that verified live account, verify/create the exact www webhook destination with all six required events and the application's API pin. Keep its signing secret private. Then run the helper with `-WebhookEndpointId` and `-StoreInVercel` to stage credentials, with both payment flags still false. This requires a trusted authenticated Vercel CLI session. No secret should be pasted into chat or included in command arguments.
3. For actual financial testing, refresh Stripe CLI authentication in the explicitly selected sandbox account `acct_1USJ2G7k4A7HyNzJ`; its existing CLI credentials have expired. Supply a fresh sandbox server key and listener signing secret privately to the isolated local application. Forward the six event types using Stripe CLI to the local `/api/webhooks/stripe`, never to production while testing. Use only `localhost:54329/fresh_stop_dev`, explicit test mode and labelled fixture approvals; never pull a shared production database URL into this test environment. Then verify real hosted success/decline/cancel/expiry, provider-signed delivery and local order/inventory reconciliation. The successful connector Session contract check does not replace this step.
4. Approve real product selling units/prices, tax categories and counted stock plus delivery fees/minimums in the existing admin. Current production values are not approved, so no customer payment can be activated.
5. Supply the missing Resend API key privately and verify delivery to approved recipients. The domain is already verified and the existing sender/merchant recipient are staged. Configure a private `CRON_SECRET` and an authenticated scheduler for the existing `/api/checkout/expire` endpoint; no schedule or business policy has been invented by this work.
6. Give final production release approval only after all integration/business gates pass. Correct source and staged www configuration still require deployment before canonical HTML changes. No release or customer charge is authorised by running this helper.

## Repeatable helper regression checks

```powershell
pwsh -NoProfile -File scripts/configure-stripe-live.test.ps1
```

Executed result: **23 passed, 0 failed**. The dependency-free harness starts isolated PowerShell subprocesses, supplies fake fixtures, and stubs every Stripe/Vercel call. It checks read-only behavior, account/mode/country/currency/charges rejection, webhook settings, disabled gates before staging, secret transport through stdin rather than arguments/output, failure recovery, and the explicit signed-delivery limitation. Every staging write position (1–6) has a failure case asserting immediate stop; completed gate writes remain false. A boundary case confirms there is no seventh write. These checks do not prove provider access or signed webhook delivery.
