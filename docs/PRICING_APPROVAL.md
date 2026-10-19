# Pricing approval workflow

Nothing in the bundled data is a selling price. `src/data/sydney-pricing-dataset.json` holds **suggestions only**
(`priceSource: "SUGGESTED"`, `approvalStatus: "PENDING"`, `isPurchasable: false`). They were produced by an AI tool
without verified sources and must be treated as placeholders. The generator
(`npx tsx scripts/generate-sydney-pricing.mjs`) cannot emit an approved price, and `src/data/pricing-dataset.test.ts`
fails if any entry is APPROVED without an approver, carries `costPrice`, has stock without `stockVerified`, or has a
duplicate id/slug.

## States

1. **Suggested**: a number in the dataset or typed by staff. Never shown to customers. The product shows "Enquire for details".
2. **Reviewed**: an admin has checked the unit and pack size (clear any `needsReview` reason), the GST treatment, and
   the real cost and margin. Still not public.
3. **Approved**: a named admin sets `priceCents` (integer cents), `approvalStatus = APPROVED`, `priceApprovedBy`,
   `priceApprovedAt`, `priceSource = ADMIN`. Only now can a price appear publicly. A product is purchasable only if the
   server-side purchasability rule also passes (published, active, `isPurchasable`, approved by a named admin, price > 0,
   `stockVerified`, enough unreserved stock) and paid checkout is enabled.
4. **Changed**: every later price change goes back through step 3 and writes an `AdminAuditLog` row with the before and
   after values (who, when, old price, new price, reason). Price history must be queryable per product.

Rules:
- Cost price stays unknown until the owner enters a real supplier cost. Never derive it from the selling price.
- Competitor or market numbers are internal references only (`src/data/market-references.json`). They are never shown as
  a "was" price or "savings". A compare-at price is shown only when an admin sets `compareAtApproved = true`.
- Stock is unknown until counted; set `stockVerified = true` only with a real count.

## Market references

`market-references.json` has two kinds. `ESTIMATE` rows are the old AI numbers: no source, confidence LOW, not evidence.
`OBSERVED` rows exist only where a page was fetched, with the exact URL and date. Current observed rows are from
Harris Farm and ALDI listing pages fetched on 2026-10-20 (the URL is the listing page; the product path is in
`productMatch`). Woolworths returned HTTP 403 and Coles product URLs returned 404, so no Coles/Woolworths prices are recorded.
Listing prices can differ by store and day, and the Harris Farm vegetable page showed items as sold out.
Re-observe before relying on any figure.

## GST (general information, not tax advice)

Under Australian GST law many basic foods are GST-free and many prepared foods, snacks, confectionery and some drinks are
taxable, but the boundary is detailed. The dataset's `taxCategory` is a provisional starting point only:
- `taxReview: PROVISIONAL_UNPROCESSED_FOOD`: fresh fruit, vegetables, herbs and basic staples (121 products). Still confirm once.
- `taxReview: NEEDS_ACCOUNTANT_CONFIRMATION`: everything else (51 products): drinks, frozen prepared foods (samosas, paratha,
  pastry), sauces and condiments, biscuits, coffee/tea, mixed boxes, packaged seafood. The current data is internally
  inconsistent in places (for example sauces taxable but mayonnaise GST-free; fruit juice and coconut water taxable).
  Do not rely on it. Ask your accountant or check ato.gov.au before approving prices for these.

## Owner checklist

- [ ] Decide which products you will actually sell at launch (the rest stay enquiry-only).
- [ ] For each: confirm name, unit, pack size and brand (resolve the 35 `needsReview` rows in the dataset).
- [ ] Enter your real supplier cost where you want margin tracking.
- [ ] Choose the selling price in dollars and cents, from your own costs and from current shelf checks you make yourself.
- [ ] Confirm GST treatment with your accountant, especially the 51 flagged products.
- [ ] Count stock and mark it verified; set order limits for perishables.
- [ ] Approve the price under your own admin name; check the audit log entry.
- [ ] Leave compare-at prices off unless you can substantiate the earlier price you actually charged.
- [ ] Before turning on paid checkout, confirm delivery fees/zones and Stripe test-mode results.
- [ ] Do not run `scripts/sync-catalogue-to-db.mjs` until it is updated: it still writes stock 150, cost and market prices.
