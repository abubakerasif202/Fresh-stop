# Stripe webhook test report — 21 October 2026

## Release continuation — 22 October 2026

Application tests were rerun after the request-time rendering fix: **396 passed, 0 failed, 0 skipped across 14 suites**. PowerShell helper tests: **23 passed, 0 failed**, with provider calls mocked. These reruns do not establish an authentic Stripe card payment or provider-signed delivery. No new payment, refund, email delivery or scheduler-provider evidence was produced.

The rebuilt Preview reaches READY but fails catalogue/store runtime database reads. Its checkout status remains 200 with `enabled:false`. Website approval does not activate customer charges; production schema changes, merge and production deployment were withheld under the explicit runtime/migration gates. See [the release handoff](FRESH_STOP_RELEASE_HANDOFF.md) and [migration procedure](PRODUCTION_TAX_MIGRATION.md).

## Current provider status — 21 October 2026

**BLOCKED for real provider end-to-end testing.** No completed test-mode card payment, authentic Stripe-signed provider delivery, observed Session expiry, Resend delivery, or scheduler run was performed in this continuation. The local Stripe CLI is authenticated to an unrelated Maple Rentals account with expired credentials. No customer charge or production data write was made.

The existing application suite exercises signed webhook construction and payment/order/inventory idempotency against the disposable local PostgreSQL database, including out-of-order failure protection, reservation release/commit, and refund retry handling. Those automated tests are application evidence, not proof of Stripe provider delivery. The earlier AUD $5 Session creation/retrieval remains historical API-contract evidence only; it was unpaid and is not a full Checkout test.

Current integrated suite: `npm test` passed 396/396 tests (14 suites), 0 skipped. The production build and local browser checks pass as recorded in the [release handoff](FRESH_STOP_RELEASE_HANDOFF.md). These include deterministic application-level signature and reconciliation tests; no real Stripe-signed delivery was observed.

New tax approval enforcement makes hosted checkout, cart refresh, and public purchasability require a supported category with explicit actor and timestamp. Production catalogue currently has zero tax-approved products. Do not create a fixture in production. Remaining provider steps require Fresh Stop test-mode credentials and authenticated CLI, a disposable fixture DB, completed test card flow, Stripe-signed webhook, and verified resulting order/reservation/email state.

## Scope

Only disposable PostgreSQL `localhost:54329/fresh_stop_dev`, newly initialized dedicated cluster at `C:\Users\abuba\fresh-stop-stripe-live-pgdata`. Four repository migrations applied locally. Guards reject remote URLs. No production orders/inventory, emails or payments changed.

Final full sequential suite: **389 passed, 0 failed, 0 skipped**, including bounded Session recovery. Typecheck, lint and diff whitespace checks passed. Detailed limits and browser evidence are recorded in [release handoff](FRESH_STOP_RELEASE_HANDOFF.md).

## Regression scope

| Area | Coverage |
| --- | --- |
| Authenticity | exact raw body, valid/invalid/missing/stale signatures, wrong signing secret |
| Environment | mode mismatch both directions, simulated live signed event, unexpected account |
| Order binding | immutable references, missing/wrong references, recorded Session/PaymentIntent/account |
| Money | exact server amount and AUD; mismatches retained for review |
| Payment success | only paid Session commits inventory; unpaid completion waits |
| Async failure / expiry | unpaid cancellation/release; paid orders never downgraded |
| Decline | intermediate failure preserves retryable Session stock |
| Duplicates / concurrency | event claims, row locks, stale claim recovery, no repeated stock/email effects |
| Out-of-order | late success/failure, refund-before-payment retry, unmatched refund review |
| Refund | partial/full cumulative amounts; older smaller events cannot reverse totals |
| Email | independent recipient leases, provider idempotency, unsent-only retry, PAID survives delivery failure |
| Checkout recovery | bounded lookup, unique references/AUD/amount, no second Session |

Supported: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`.

## Evidence limits

### Real sandbox contract check during continuation

**PASS:** authenticated sandbox `acct_1USJ2G7k4A7HyNzJ` created and retrieved Session `cs_test_a1MIQIVI5pSrUXf8B3b5m7CYoIo6QJrHBmZaicdpslRoMtauFugy4sTRpl`. Stripe returned `livemode:false`, `ui_mode:hosted_page`, `amount_total:500`, `currency:aud`, `status:open`, `payment_status:unpaid`, with the correct local fixture reference. Parameters were built using the existing application builder and server-priced disposable local order. All requested settings were accepted by the connector's `2026-09-30.preview` API specification; this does not independently prove the SDK-pinned `2026-09-30.endive` transport, which remains unchanged.

Only a labelled TEST fixture was created/reserved in `localhost:54329/fresh_stop_dev`; no production order or inventory change. The real test Session ID is recorded on that local pending order. No card submitted, no order marked paid and no fulfillment/email triggered. Existing Stripe CLI authentication is expired; no fresh sandbox server key/signing secret has been supplied privately. Therefore actual paid/declined hosted flows and provider-signed delivery remain **BLOCKED**.

The connector does not expose the Session expiration operation (discovery/details checked), so manual expiration was not performed. The unpaid Session is configured to expire automatically at **2026-10-21 01:36:40 UTC**; this timestamp is configuration evidence, not observed expiration. No replacement Session was created. After that time, read its actual status before releasing/cleaning the local fixture. Local stock remains reserved under the existing bounded TTL.

Signatures generated locally with Stripe SDK. Live-mode tests use inert credentials/injected clients, not real live authentication. Checkout/email transports mocked. No real hosted card payment, provider-driven signed delivery, Resend delivery or scheduler execution performed. No test card entered in Live Mode. Actual provider end-to-end gates remain BLOCKED.

Unmatched refunds persist FAILED and return retryable errors. Retained records permit manual investigation after Stripe's retry window. Ambiguous/truncated Session recovery fails closed; investigate Stripe before restarting or fulfilling an unresolved order.

## Destination

Owner-approved target `https://www.freshstop.com.au/api/webhooks/stripe`. Live account, endpoint existence/events/API version/signing secret and signed delivery NOT VERIFIED. Sandbox listing returned zero endpoints. No endpoint created without verified live identity.

References checked through current documentation and installed SDK types: [Session parameters](https://github.com/stripe/stripe-node/blob/master/src/resources/Checkout/Sessions.ts), [signature verification](https://docs.stripe.com/webhooks/signature), [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment). Remaining steps: [TODO](../STRIPE_INTEGRATION_TODO.md).
