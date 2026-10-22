# Owner-approved checkout activation — 22 October 2026

## Authorisation and scope

The owner approved generated selling prices and commerce values, requested 10% GST, supplied payment credentials privately through Vercel, explicitly requested stopping further testing, and approved paid backorders with the confirmation that all products remain available to order. This supersedes the earlier checkout-disabled release requirement. No real charge is authorised or performed by this continuation.

## Changes

- Save all 172 repository-generated selling prices/units as owner-approved ADMIN prices, including 10% GST as requested. Each changed price has a ProductPriceHistory record and the batch has a before/after AdminAuditLog entry, attributed to the owner's Codex instruction.
- Enable the two existing delivery-zone proposals using existing postcodes, A$9.99 standard delivery, A$50 delivery minimum and free delivery from A$150. Pickup has no minimum. Delivery's requested inclusive GST is recorded separately and included in persisted GST totals.
- Use explicit BACKORDER product availability. Preserve physical inventory fields. Customers can order and pay while items are sourced, with clear notices on product pages and checkout.
- Add InventoryReservation.isBackorder, default false. Snapshot the fulfilment policy at reservation time. Commit, expiry and release preserve normal order/payment lifecycle and idempotency while backorder lines do not change physical inventory.
- Preserve stock-controlled behaviour for products without the explicit backorder policy. Retain price/tax approval, signed webhooks, account/mode verification, quantity caps, rate limits, order privacy and server-side pricing.
- Add BACKORDER to authenticated admin controls and configuration badges. Update the FAQ and delivery ordering text for paid checkout.
- Production uses verified Fresh Stop Stripe account acct_1USJ246bUDM9kb4q. Secrets remain in Vercel, never this repository. Enquiry/demo mode is switched off for the production build; environment and database checkout gates open only after the new production deployment reaches READY.

## Backup and rollback

The earlier restore-verified full backup is preserved. A new private full production logical backup was captured immediately before these changes: 420989 bytes, SHA256 a8ce5b2e0484e7d4c6ecd28ef6eba60a8ca03f7e7a0a8ad081663a73f0fe910d. No new restore rehearsal was run because the owner stopped testing. A private before-change commerce snapshot preserves all product values, delivery settings and original approval state. Neither backup is in Git.

The production change is additive; no init migration was replayed, no reset occurred, and no orders/customers were removed. To pause sales, set paidCheckoutApproved=false and PAID_CHECKOUT_ENABLED=false; keep signed-webhook processing enabled for existing sessions. Do not remove reservation snapshots or reset business data. Restoring commerce values requires a separately reviewed change if live orders have arrived.

## Evidence and limits

Static review and Git whitespace inspection were performed. Prisma Client generation and the normal Vercel deployment build are required build steps. **No further test suite, browser payment journey, provider-signed webhook exercise, sandbox payment or real charge was run.** Earlier passing test counts apply to the preceding checkout-disabled source and do not validate this follow-up.

Deployment ID/SHA and the final configuration state are recorded in the final handoff/release comment after activation. The change enables checkout; it is not a claim of a completed customer payment.

If the owner later requests validation, repository commands are npm run typecheck, npm run lint, npm test and npm run build, with DB-backed tests restricted to an isolated test database. They were not run as standalone checks in this continuation.
