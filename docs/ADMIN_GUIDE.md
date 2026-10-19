# Fresh Stop admin guide

## Owner presentation: draft pricing

Export CSV, edit `Suggested Price AUD`, preserve slugs/units, then use **Bulk edit draft prices with CSV**. Preview up to 200 rows/200 KB and enter the displayed confirmation before saving. Imports atomically save audited draft cents, without approving payment prices or stock. Pending imports use ADMIN_DRAFT provenance; existing approved provenance is preserved. Display priority is approved owner price, explicit admin draft, then researched registry. Final selling-price approval remains separate.

Admin checkout approval cannot activate payments while presentation mode is enabled. See [owner handoff](CLIENT_HANDOFF.md).

Everything below describes what the admin portal (`/admin`) does today. Sign in with the HTTP Basic Auth credentials (`ADMIN_USER`, `ADMIN_PASSWORD`). Your sign-in name is recorded on every change you make. If `ADMIN_PASSWORD` is not set the portal is closed (HTTP 503).

Nothing in the portal assumes a price, stock level, delivery fee or threshold. Unknown stays unknown until you enter it.

## Pages

| Page | Purpose |
| --- | --- |
| `/admin` | Counts: products awaiting price approval, purchasable products, products with unknown or unverified stock, approved delivery zones, paid-checkout gate status, orders needing review. |
| `/admin/pricing` | Compare suggested prices with market references and approve selling prices. |
| `/admin/products` | Catalogue details, publishing, stock, availability and the purchasable switch. |
| `/admin/delivery` | Delivery zones: postcodes, fees, thresholds, approval. |
| `/admin/orders`, `/admin/orders/[id]` | Order list, filters, detail, fulfilment steps, cancel, re-send emails. |
| `/admin/audit` | Read-only audit log, filterable by entity type and ID, 30 entries per page. |
| `/admin/settings` | Integration status and the paid-checkout gate. |

## Getting a product on sale

A product can be bought online only when all of these are true: published, active, price approved by a named admin, stock count verified, and you have switched it to purchasable. Each step is separate.

1. **Approve a price** (`/admin/pricing`). Type the price in dollars (for example `4.50`). It is converted to whole cents and must be above $0 and at most $500.00. Click "Approve price", read the dialog (product name and price) and confirm. This sets the approved price, your name and the time, marks the price source as ADMIN, and writes a price-history row and an audit row in one database transaction. A product needs a selling unit first (set it on the Products page).
2. **Verify stock** (`/admin/products`, open a product). Enter the stock quantity, tick "I counted this stock and it is verified" and save. Typing a number alone never verifies it, and changing the number later clears verification until you tick it again. The reserved quantity (held by open checkouts) is shown read only. Stock cannot be set below the reserved quantity.
3. **Switch on "Purchasable online"** and save. The server refuses and lists the reasons if the price is not approved, stock is not verified, the product is unpublished or inactive, no unreserved stock remains, or availability is OUT_OF_STOCK, DISCONTINUED or ENQUIRY_ONLY. If a later edit makes a purchasable product ineligible, the switch is turned off automatically and you are told why.

Approving a price never makes a product purchasable.

### Market references

Each product can show references. **OBSERVED** rows have a dated, sourced observation (retailer, pack size, price, link). **ESTIMATE** rows are unverified and shown faded and italic. Neither is ever used as a price: you type the price yourself. The "suggested" price is a starting point, not an approved price. Cost price is not shown or exported anywhere.

### Review flags

Products flagged `needsReview` in the pricing dataset show their reasons. To approve one you must tick the override box and give a reason of at least 10 characters; the reason is stored in the audit row.

### Bulk actions

There is no "approve everything" action; the old bulk-publish endpoint is rejected. Bulk work is limited to filtering, reviewing and exporting the CSV. Optionally you can tick up to 10 products and use "Approve selected at suggested price": a preview lists every product and price, and you must type the phrase `APPROVE <n> PRICES`. It is all-or-nothing; products with no suggestion, no unit, or a review flag are refused and must be approved individually. Bulk approval leaves every product non-purchasable.

### Withdrawing an approval

"Withdraw approval" (reason of at least 10 characters) clears the approver, returns the product to PENDING and switches purchasable off.

### State badge

- **Verified**: approved price and verified stock.
- **Suggested**: a suggested price exists but nothing is approved.
- **Pending approval**: a price figure exists without a suggestion and is not approved.
- **Missing configuration**: no price at all, or an approved price without verified stock.

### CSV export

`/admin/pricing` > "Export CSV" downloads suggested and approved prices, units, approval status and approver, GST treatment, commerce state, stock status (unknown, unverified or verified), availability, purchasable flag, and the number of observed and estimate references. It contains no cost or competitor prices. Cells beginning with `=`, `+`, `-`, `@` or a tab are prefixed with an apostrophe so spreadsheets do not run them as formulas.

## Delivery zones

Create a zone with a name, 4-digit postcodes (comma separated), a fulfilling branch, and optionally a delivery fee, a "free delivery from" amount (empty means free delivery never applies), a minimum order, delivery days, cut-off hour and a daily order limit. Money is typed in dollars and stored as integer cents (the old decimal columns are filled in from the cents automatically).

A new zone is **not approved**. "Approve zone" needs an active zone, a delivery fee, valid postcodes and no postcode already in another approved zone; it records your name and the time. **Editing the fee, free-delivery threshold, minimum order or postcodes withdraws the approval** until you approve again. The page shows a "Missing configuration" banner while no approved zone exists. Deleting a zone is audited.

## Paid checkout gate (Settings)

Paid checkout opens only when all of these hold: the environment variable `PAID_CHECKOUT_ENABLED=true`, the database approval on this page, a Stripe **test-mode** key (live keys are rejected), and at least one approved delivery zone. The panel lists exactly which checks are failing. To switch the database approval on, type `ENABLE PAID CHECKOUT`; switching it off needs no phrase. Both actions are audited. This page cannot set the environment variable.

## Orders

Filter by payment status and order status. Order detail shows the customer, fulfilment details, items, totals and payment information. Stripe session and payment-intent IDs show only their last 4 characters.

- **Payment is set only by verified Stripe events.** The admin cannot mark an order paid; any request carrying a payment field is rejected.
- Statuses an admin can set: `RECEIVED > PREPARING > READY > OUT_FOR_DELIVERY > DELIVERED`. A pickup order goes `READY > DELIVERED` (collected) and never `OUT_FOR_DELIVERY`. No skipping steps. Orders awaiting payment (`PENDING_PAYMENT`) and unpaid orders cannot enter these states.
- **Cancel** is allowed before `DELIVERED`. Cancelling an unpaid order marks it cancelled, sets payment status to EXPIRED and releases its stock reservation in the same transaction. Cancelling an already-paid order does **not** refund the customer or restore stock: issue the refund in the Stripe dashboard.
- **Re-send confirmation emails** works only for paid orders and records the outcome in the audit log (not the addresses).

## Audit log

Every change above writes an audit row in the same transaction as the change: action, entity type and ID, your sign-in name, and before/after values. Passwords, tokens and keys are redacted and large values are truncated. Re-sending emails writes its row after the send. The viewer is read only.

## Safeguards on every change

All admin write requests require valid credentials, must come from the same origin, must be JSON under 16 KB, and are validated before use. Competing edits to the same product or order are detected and ask you to reload. Preview deployments in reviewed-snapshot mode are read only.

## Continuation safeguards — 20 October 2026

Changing a product's selling unit withdraws its selling-price and comparison-price approvals and disables purchase. Re-approve the correct price for the new unit. Revising a selling price also withdraws compare-at approval. Bulk price approvals enforce the same integer-cent limits as individual approvals.

Delivery zone approval and edits are serialized to prevent concurrent approval of overlapping postcodes. Changing active status or fulfilling branch also withdraws approval. Scheduling days, cutoff hour and daily capacity are not enforced by checkout: zones with any of these three fields configured cannot be approved. Clear them for basic postcode/fee/minimum delivery, or complete scheduling enforcement before using those constraints. Changing them withdraws an existing approval.

Admin cancellation locks the order against concurrent payment handlers. Paid cancellations retain payment state and consumed stock; a manual reviewed refund policy is required. Payment-review acknowledgement records review only and never changes payment status. Unexpected admin errors log only an allowlisted database code; database messages and mutation payloads are excluded.
