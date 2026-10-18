# Operations

## Product and category maintenance

Production uses its published PostgreSQL products (171 products / 11 categories verified on 18 October), independently of the local reviewed-snapshot definitions. Use protected `/admin/products` to review product names, descriptions, category, image and publication flag. Confirm facts before publishing. Keep unknown price/unit null; Production nullability is independently verified. No public price or stock promise is made by the enquiry catalogue.

The runtime changes Supabase shared-pooler `DATABASE_URL` from session port 5432 to transaction port 6543 and enables `pgbouncer=true` for Prisma. The owner-supplied session-pooler URL was also stored under `DATABASE_URL_UNPOOLED` for build/schema compatibility; it is not a true direct endpoint. Obtain an authorized actual direct URL privately before future migration tooling requires it. The actual Production project `asjjjivkmugbcruzdhju` is now independently verified: all six models pass, price/unit are nullable and publication indexes are valid. No Production SQL was needed. Earlier denied connector/integration targets must not be substituted for this verified database. See PRODUCTION_DATABASE_VERIFICATION.md.

Categories currently come from the database and staged source. There is no dedicated category/settings editor or image-upload service. Use a reviewed repository/data change for category or store configuration; do not claim unsupported admin features. Product image selection uses the existing allowed local inventory. Add optimized images under public/products, record provenance and alt text, then use protected product editing. Do not upload internal-only supplied store photographs.

## Proposed catalogue review

`src/data/catalogue-candidates.ts` contains 161 proposals. They are never auto-imported by build/deploy. `scripts/import-enquiry-catalogue.ts` defaults to an offline plan; `--audit` checks duplicates read-only. `--apply` requires the explicit documented approval guard and creates unpublished drafts only. Confirm schema compatibility before any approved import, then staff must separately review publication. Do not run a seed/reset on a live database.

```powershell
npx.cmd tsx scripts/import-enquiry-catalogue.ts
npx.cmd tsx scripts/generate-catalogue-evidence.ts
npx.cmd tsx scripts/catalogue-image-audit.ts
```

The latter two commands regenerate offline review evidence/downloads; they do not certify stock, image licensing or visual approval. The historical contact sheet is only the earlier 71-image subset. Twelve branded subjects still need legitimate packshots.

## Enquiries, orders and payments

Product enquiries open email/WhatsApp with the product name; delivery and wholesale use configured contact links. Messages are sent by the visitor in the external application; the website cannot promise delivery or successful submission. There is no contact form backend, automated customer/business notification or payment gateway. Checkout and public order lookup are retired. `/admin` retains historical order views/status management in database mode and requires authorization; Preview must not read these records.

Confirm any delivery coverage, fee, minimum, timing, pickup arrangements, refund terms and current availability directly with staff. Do not invent defaults or revive customer checkout without a separately configured, tested backend and owner-approved terms.

## Routine maintenance

Monitor Vercel runtime/build errors and DB connectivity. Verify key routes after each release. Rotate ADMIN_PASSWORD and Redis tokens privately; never log them. ORDER_TOKEN_SECRET is legacy and is unnecessary for current enquiry routes. Maintain dependencies and review full npm audit: current braces advisory affects development tooling with no patched latest release at audit time; runtime audit is clean. Recheck advisories before future releases.

Use actual schema backups and platform restore facilities for incidents. Never export historical customer data into public artifacts or source control. Store hours, contacts and maps use existing records and require staff confirmation when changed.

## Generic image overrides and policy intake

`src/data/catalogue-illustrations.ts` contains the owner-approved 12-item generic food illustration map. The public catalogue substitutes an illustration only when that exact product slug still has the shared placeholder path. A real owner-managed image takes precedence automatically. Each generated file lives under `/products/ai/` and receives an AI label; these 12 also disclose that actual products/packaging are not shown. No stock, ingredients, package size, price or brand art is inferred. Use verified package references and rights approval before switching to actual packshots.

Retain source/license records in `docs/IMAGE_SOURCE_RECORDS.md` and the illustration generation hashes in `docs/evidence/generic-food-illustrations.json`. Neither docs nor `assets/product-masters/` are hosted. Run `node.exe --import tsx scripts/generate-catalogue-evidence.ts` and `node.exe --import tsx scripts/catalogue-image-audit.ts` after an approved image update; these operate offline and write evidence only.

Use OWNER_INPUT_REQUIREMENTS.md to collect privacy, terms, refund, delivery and pickup facts. Do not invent policy pages from unanswered fields. Recheck the full dependency audit when braces receives a compatible fix; runtime audit currently reports zero advisories, while development audit remains five high findings. Production schema verification and future backup/rollback controls are in PRODUCTION_DATABASE_VERIFICATION.md.
