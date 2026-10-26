# Stripe sandbox end-to-end run — 27 October 2026

Account `acct_1USJ2G7k4A7HyNzJ` (AU, AUD, `livemode: false`), verified through the API before any session was created.
App: `next dev` on localhost:3100 against the disposable local PostgreSQL (`localhost:54329`), `STRIPE_MODE=test`,
`STRIPE_ALLOW_LIVE=false`. Events were genuine Stripe sandbox events forwarded and signed by `stripe listen`.
Fixture: one approved product at A$12.50, stock 10, pickup order, quantity 2. No live key, live charge or production write.

| Scenario | Result (observed) |
| --- | --- |
| Session creation | Hosted Checkout Session created; page showed A$25.00 (server-priced, qty 2 x A$12.50, GST free) |
| Successful payment (test card 4242) | `checkout.session.completed` delivered, HTTP 200; order PAID/RECEIVED, `paidAt` set, stock 10 -> 8, reservation COMMITTED |
| Duplicate delivery | Same event id resent via `stripe events resend`; HTTP 200; stock stays 8, still one COMMITTED reservation |
| Declined card (4000 0000 0000 0002) | `payment_intent.payment_failed` delivered, 200; payment FAILED, order stays PENDING_PAYMENT, stock stays reserved for retry |
| Expired session | `checkout.session.expired` delivered, 200; order EXPIRED/CANCELLED, reservation EXPIRED, reserved stock 2 -> 0 |

Not covered by this run: customer email delivery (Resend key not set locally), cancelled-checkout return page,
real out-of-order delivery (covered only by the application test suite), Preview deployment and its webhook endpoint.
