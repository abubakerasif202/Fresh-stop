# Windows production stabilisation — 22 October 2026

## Decision: NO-GO for accepting customer payments

Production was inspected read-only. No checkout flags, prices, stock, tax approvals, live orders, credentials or production records were changed. No live charge/refund or production deployment was performed. Existing original checkout modifications were preserved.

## Verified production

- www resolves to Vercel production deployment `dpl_5kLcHMTY8zXhJHatsPCiZvaDUyXL`, READY, main SHA `adeb28b60f7d5e0eb51b115ee31e3e8ed50e8442`.
- GitHub PR #14 is MERGED (merge SHA `3a767676a83954c90b1d7289314f0047e5a1897e`). It is historical, not the correction PR.
- Vercel Production: PAID_CHECKOUT_ENABLED=true, STRIPE_MODE=live, STRIPE_ALLOW_LIVE=true, NEXT_PUBLIC_STOREFRONT_DEMO=false, STRIPE_EXPECTED_ACCOUNT=acct_1USJ246bUDM9kb4q. Database paidCheckoutApproved=true.
- Supabase asjjjivkmugbcruzdhju is ACTIVE_HEALTHY in ap-southeast-2, PostgreSQL 17.11. Authenticated read-only SQL succeeded. All 14 application tables have RLS; Order has no Data API policy, so existing anon grants do not grant row access. New sensitive commerce tables have no anon/authenticated SELECT grants.
- 172 products: all positive prices, purchasable, BACKORDER, TAXABLE_10. Product snapshot contains public catalogue data only. Stock remains unverified/null. Two active approved delivery zones: 999-cent fee, 5000-cent minimum, 15000-cent free threshold. Rockdale and Riverwood active.
- At snapshot: one PENDING/PENDING_PAYMENT order, one ACTIVE backorder reservation, zero PaymentEvent records. No customer-identifying order fields were queried. No successful end-to-end webhook journey is established by these observations.
- No error/fatal groups returned in the latest available 30-minute Vercel log window. A 24-hour request exceeded retained log access; this is not a claim of a clean full-day history.

## GST review — approval required

The CSV reviews every product: 154 proposed GST_FREE, 2 proposed TAXABLE_10, 16 REVIEW_REQUIRED. These are proposals, never production approvals. Generic descriptions do not prove ingredients, preparation or supply conditions. Confirm actual SKUs/labels and accountant approval for every row; low-confidence rows deliberately remain unresolved.

Fresh unprepared produce should generally be GST-free. Plain cooking ingredients, milk and eggs also have GST-free rules. Halawa and sweet biscuits are proposed taxable. Frozen samosas must not automatically be taxable: preparation method matters. Juice composition/carbonation, nuts processing, mixed frozen selections and box contents need evidence.

References: [ATO GST-free food](https://www.ato.gov.au/api/public/content/0-d5b4612a-b7f7-4fea-b46b-e5adf657055c), [ATO basic-food guidance](https://smallbusiness.taxsuperandyou.gov.au/goods-and-services-tax/gst-free-items-and-services), [ATO detailed food list](https://www.ato.gov.au/law/view/document?docid=GII/GSTIIFL1/NAT/ATO/00001). The legal-list direct fetch returned 403; indexed ATO entries were available. Recheck current legal entries during accountant approval.

Keep owner selling prices unchanged. Where approved GST-free, the included GST component becomes zero without changing the selling price. CSV impact is a per-unit indication only; production calculates tax on quantity-extended lines, so rounding can differ. Historic orders/receipts must not be rewritten automatically. Have the accountant review any existing issued receipts/BAS implications.

Delivery currently uses a blanket TAXABLE_10 setting. [GSTD 2002/3](https://www.ato.gov.au/law/view/document?docid=GSD/GSTD20023/NAT/ATO/00001) distinguishes separate delivery services from delivered goods/mixed supplies. Obtain the accountant's supply-characterisation and allocation policy before changing delivery tax; do not assume changing products alone completes GST remediation.

## Stripe and credential limits

Production secret and webhook signing secret exist as protected sensitive Vercel variables; values were not retrieved/exported. Presence does not prove validity, correct destination binding or rotation. The connector offers only test-mode contexts: Fresh Stop sandbox acct_1USJ2G7k4A7HyNzJ and Fresh Stop acct_1USJ246bUDM9kb4q. In the latter test context, webhook endpoint listing returned an empty complete list. This says nothing about live endpoints. No live account API identity, live six-event registration or provider delivery was verifiable with available access.

Code handles: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, payment_intent.payment_failed, charge.refunded. Verify all six on the LIVE destination https://www.freshstop.com.au/api/webhooks/stripe privately. Confirm account identity, charges/payout readiness and a matching replacement signing secret.

Revocation of previously exposed restricted keys is UNVERIFIED. Owner must check Stripe Developers/API keys, revoke all exposed restricted keys, configure a new least-privilege STRIPE_SECRET_KEY privately in Vercel Production, and verify the intended account. Rotate STRIPE_WEBHOOK_SECRET if it was exposed; create/update the correct endpoint secret privately. Do not paste values into chat or Git. Test secrets belong only to isolated test deployments. Recent Vercel variable creation timestamps alone are not revocation evidence.

Source review found raw-body signature verification, expected-account/mode checks, server-priced integer AUD cents, Checkout and PaymentIntent order metadata/client_reference_id, idempotent session requests, unique durable event claims, conditional locked transitions, cumulative refund handling, and backorder reservation snapshots that skip physical-stock mutations. Automated provider mocks cannot establish real provider operation.

## Remaining owner/provider gates

1. Approve temporarily closing new paid checkout. Smallest immediate change: set database paidCheckoutApproved=false (single existing DeliverySetting row), leaving webhook processing on. Set Vercel Production PAID_CHECKOUT_ENABLED=false and deploy only after explicit approval. Already-open Stripe sessions are not cancelled by these flags; review them privately before deciding whether to expire them. No automatic order cancellation or refund.
2. Accountant reviews CSV, labels and delivery treatment; authorise a separate targeted tax-category change preserving prices and historic orders.
3. Privately verify live Stripe identity, six endpoint events, signing secret and exposed-key revocation/replacement. No payment-mode changes were made during audit.
4. Run a provider-backed TEST-MODE checkout/payment/signed-webhook/refund journey with labelled synthetic orders and isolated DB. No real-provider journey was executed here; no safe complete test credential/destination environment was available.
5. Decide policy for partially refunded orders: current fulfilment transitions require PAID, so PARTIALLY_REFUNDED orders cannot advance. This behaviour remains a documented operational blocker pending a deliberate policy.
6. Review and approve correction PR, then approve production deployment and run postdeployment smoke. Until all gates close, keep NO-GO.

## Database connection and backups

Production catalogue routes exercise Prisma successfully; authenticated Supabase SQL independently succeeds. Protected deployed DATABASE_URL could not be inspected, so its actual hostname/port was not newly verified. Prior committed release notes record aws-0-ap-southeast-2.pooler.supabase.com:6543 and session 5432. runtimeDatabaseUrl normalises Supabase pooler to transaction 6543 with pgbouncer=true. Local .env.local points to localhost:54329; its successful Prisma count is LOCAL evidence only.

Existing backup files were neither accessed nor changed. Committed restore evidence records the private 420201-byte dump SHA256 0b36755e6d5b58cab670689ef0afac75f398912b2f8385c2ab73d10a7218e807 and an isolated restore. Activation notes record a later 420989-byte dump SHA256 a8ce5b2e0484e7d4c6ecd28ef6eba60a8ca03f7e7a0a8ad081663a73f0fe910d without a new restore rehearsal. Their file existence/checksums were not reverified on Windows. Do not replay init migrations or restore over production.

## Corrections prepared for review

- Failed-payment admin cancellation now releases active reservations in the cancellation transaction.
- Paid and partially refunded cancellation reports an outstanding refund when funds remain; no provider refund is initiated.
- Backorder products require literal customer acknowledgement before new order/session creation. Named items and unconfirmed availability/timing are shown before consent. Cart changes clear consent. Locked reservation checks reject policy changes after pricing.
- Admin order list/detail expose the stored backorder reservation flag.
- Guest checkout preserves existing Customer name/phone; entered contact details remain on the order snapshot.
- Existing provider sessions predate these checks and require separate owner review. Backorders intentionally have no physical-stock limit; they do not constitute verified on-hand inventory or a fulfilment promise.

Validation and correction evidence is recorded in VALIDATION.md after final checks. Positive production admin login was not attempted without private authorised credentials; unauthenticated rejection was verified.
