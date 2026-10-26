# Deployed Preview Stripe sandbox run — 27 October 2026

Follows `STRIPE_SANDBOX_E2E_20261027.md` (local run). This run used the deployed Preview of PR #17
(branch `chore/preview-stripe-verification`, region `syd1`) with Stripe sandbox account `acct_1USJ2G7k4A7HyNzJ`
(`livemode: false`). No live key, live payment or refund was used.

## Isolation

- Preview database: Supabase project `wayiuoynkegtebdxzwry`. Production: `asjjjivkmugbcruzdhju`. Separate projects.
- Runtime identity was proved without reading credentials: a genuine signed webhook event delivered to the deployed
  Preview was recorded in the Preview project and absent from Production.
- Production before and after: 172 products, 1 order, 1 reservation, 1 payment event, `paidCheckoutApproved = true`,
  no QA rows. Unchanged.
- QA fixtures (2 products, 1 category, 5 orders) existed only in Preview and were removed afterwards. Two earlier
  `AdminAuditLog` rows (23 Oct, enquiry actions) were preserved.

## Payment lifecycle (all observed on the deployed Preview)

| Scenario | Result |
| --- | --- |
| Cart | 2 x A$12.50 added in the UI, cart showed A$25.00 |
| Hosted Checkout | Sandbox account page showed A$25.00 (server-priced, GST free), pickup |
| Successful payment (4242) | Order PAID/RECEIVED, `paidAt` set, reservation COMMITTED, stock 10 -> 8, reserved 0 |
| Return page | "PAYMENT CONFIRMED", correct items, total and collection store |
| Duplicate delivery | Same event resent: HTTP 200, stock stays 8, still one COMMITTED reservation, one event record |
| Declined card (4000 0000 0000 0002) | Payment FAILED, order stays PENDING_PAYMENT, reservation stays ACTIVE for retry |
| Expired session | Order CANCELLED/EXPIRED, reservation EXPIRED, reserved stock released |
| Cancelled checkout | Order stays PENDING_PAYMENT until expiry. The checkout page shows no cancellation notice (cosmetic gap, not fixed here) |
| Cron sweep (expiry + paid-order protection) | Three unpaid reservations were expired and their orders cancelled; the paid order stayed PAID with its COMMITTED reservation and stock stayed 8, even with its reservation time set in the past |

Reservation `expiresAt` values were set in the past directly in the Preview database to exercise the sweep without a
30 minute wait. The sweep itself ran unmodified against the deployed Preview.

## Defect found and fixed

Stripe `success_url` / `cancel_url` were built from `NEXT_PUBLIC_SITE_URL`, falling back to the production domain, so a
Preview payment returned the customer to the live site (404 for a Preview-only order). Preview deployments now return
to their own URL (`src/lib/checkout-return-base.ts`); every other environment keeps the configured site URL. Verified on
a fresh Preview session.

## Email and cron

- Preview had no Resend credentials: the pipeline returned `NOT_CONFIGURED`, sent nothing, and left the sent markers
  empty so the order was retried later.
- With a temporary sending-only key and both recipients set to Resend's `delivered@resend.dev` test sink, one cron
  sweep sent exactly one customer confirmation and one owner notification (both delivered); a second sweep sent none.
- The cron route returns 401 for a wrong or missing secret and 200 for the correct one.
- The temporary key and its branch-scoped Vercel variables were removed after the test.

## Performance (`/products`, Preview `syd1` vs production)

Production dynamic pages are served from `iad1`; Preview from `syd1`.

| Measure | Preview | Production |
| --- | --- | --- |
| Server response, curl median of 8 cache-busted requests on `/` | 205 ms | 2,387 ms |
| Server response, same on `/products` | 155 ms | 2,145 ms |
| Server response, same on `/cart` (static) | 101 ms | 89 ms |
| Lighthouse main document, unthrottled, median of 3 | 287 ms | 3,032 ms |
| Largest Contentful Paint (unthrottled) | 684 ms | 3,173 ms |
| Speed Index (unthrottled) | 631 ms | 3,082 ms |
| Performance score (unthrottled) | 100 | 88 |

Lighthouse's default simulated throttling hid the server gap (its server-response audit read about 21 ms for both
because of the simulation); its raw main-document timings agreed with curl. Unthrottled runs use a fast network, not
the mobile 4G profile.

## Not covered

- Real out-of-order webhook delivery (covered by the application test suite only).
- Production payment configuration, which was not changed and needs separate approval.
