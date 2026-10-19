# Operations

The sections below record the earlier production enquiry-only release. For the 20 October development commerce implementation, migration requirements, email retries and scheduler configuration, use [RELEASE_HANDOFF.md](RELEASE_HANDOFF.md) and [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md). No production activation is implied by the local implementation.

## Product and category maintenance

Production uses its published PostgreSQL products (171 products / 11 categories verified on 18 October), independently of the local reviewed-snapshot definitions. Use protected `/admin/products` to review product names, descriptions, category, image and publication flag. Confirm facts before publishing. Keep unknown price/unit null once the database schema supports it. No public price or stock promise is made by the enquiry catalogue.

The runtime changes Supabase shared-pooler `DATABASE_URL` from session port 5432 to transaction port 6543 and enables `pgbouncer=true` for Prisma. `DATABASE_URL_UNPOOLED` stays direct for schema tooling. The additive compatibility SQL has only been applied to the available integration database. The separate Production database needs owner access to verify nullable `price`/`unit` and `Product_isPublished_idx`; Vercel hides its URL/password from local `env pull`, and the current Supabase MCP account is denied access. Production catalogue reads pass, but do not assume all admin draft-write schema requirements are present until this check is complete.

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
