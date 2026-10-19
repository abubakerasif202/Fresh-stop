# E-commerce engineering continuation — 20 October 2026

This records the local continuation from `631619f` on `feat/fresh-stop-ecommerce-final-hardening`. It supersedes earlier enquiry-only descriptions of checkout in HANDOFF/OPERATIONS. Production remains unchanged.

## Implemented

- Database-backed published catalogue, search/category browsing and product details; pending products remain enquiry-only.
- Persistent cart with server refresh, quantity conflicts, drawer focus handling and checkout availability checks.
- Integer-cent server pricing, approved prices, verified stock, audited comparison prices, configured delivery fees and minimums.
- Transactional stock reservations, locked price/configuration rechecks, complete checkout-payload idempotency and failed-session cleanup.
- Pinned Stripe sandbox identity, signature verification, atomic payment reconciliation, expiry, failures and refund-event recording.
- Explicit cancellations never revive fulfilment after late payment. Paid inventory conflicts remain held for manual review.
- Scoped customer lookup, expiring email tracking credentials, recoverable email leases and provider idempotency.
- Authenticated admin pricing, inventory, delivery, orders, payment exceptions, audit and checkout approval.

## Operational boundaries

No automatic refund initiation or restocking policy is implemented. Refund webhooks record verified payment changes only. Unsupported delivery scheduling/capacity constraints cannot be approved; the supported path is postcode coverage, fee and order minimums. Final business approval is required for pricing, stock, GST classification, delivery and payment activation.

Real Stripe, Resend delivery and production database state are not certified by local mocks. See RELEASE_HANDOFF and STRIPE_TESTING for release gates and exact validation evidence.
