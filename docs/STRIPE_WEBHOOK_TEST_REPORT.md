# Stripe webhook test report — 21 October 2026

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

Signatures generated locally with Stripe SDK. Live-mode tests use inert credentials/injected clients, not real live authentication. Checkout/email transports mocked. No real hosted card payment, provider-driven signed delivery, Resend delivery or scheduler execution performed. No test card entered in Live Mode. Actual provider end-to-end gates remain BLOCKED.

Unmatched refunds persist FAILED and return retryable errors. Retained records permit manual investigation after Stripe's retry window. Ambiguous/truncated Session recovery fails closed; investigate Stripe before restarting or fulfilling an unresolved order.

## Destination

Owner-approved target `https://www.freshstop.com.au/api/webhooks/stripe`. Live account, endpoint existence/events/API version/signing secret and signed delivery NOT VERIFIED. Sandbox listing returned zero endpoints. No endpoint created without verified live identity.

References checked through current documentation and installed SDK types: [Session parameters](https://github.com/stripe/stripe-node/blob/master/src/resources/Checkout/Sessions.ts), [signature verification](https://docs.stripe.com/webhooks/signature), [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment). Remaining steps: [TODO](../STRIPE_INTEGRATION_TODO.md).
