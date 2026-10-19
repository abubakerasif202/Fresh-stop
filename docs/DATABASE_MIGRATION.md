# Database migration: fail-closed commerce schema

## Continuation verification — 20 October 2026

Four migrations are now present. In addition to the two described below, `20261020010000_email_delivery_leases` adds nullable customer/business email claim timestamps and revision zero, and `20261020020000_email_access_issuance` adds a stable link issuance timestamp. Both are additive and required before deploying the current application. Sent timestamps now mean provider acknowledgement, not merely a claimed send. Do not remove these columns while the current application is running.

Current local verification: Prisma validation, full client generation and migration status PASS against `localhost:54329/fresh_stop_dev`; all four migrations applied. A private local `pg_dump` restored successfully into separate `fresh_stop_restore_codex_20261020` (four migration rows, eight clearly labeled browser-fixture products, zero orders at backup time). Backup: `C:/Users/abuba/fresh-stop-local-backups/codex-local-20261020.dump`. This is a disposable-development backup, not a production backup. No production connection, backup, migration or data correction was performed. Obtain and restore-verify a real production backup before separately authorized release.

Rollback for this continuation: keep checkout disabled, stop the application, restore the approved pre-release backup and deploy its matching application commit. Preserve new orders and reconcile payments first if any activity occurred. Existing manual rollback SQL covers the earlier commerce migration only and is not a complete rollback for the email additions.

Status: everything below was run ONLY against the disposable local Postgres 18.6 (`localhost:54329`, db `fresh_stop_dev`). Nothing was run against Supabase or any remote database. Items marked NOT RUN need a human with remote access.

## 1. What the previous session (Antigravity) changed

Derived from `git diff d88ad89^ d88ad89 -- prisma/schema.prisma` (the `db push` SQL equivalent was regenerated with `prisma migrate diff`). It is a schema-only inference: git cannot prove which database the push hit.

- Product gained 16 columns with unsafe defaults: `stockQuantity DEFAULT 100`, `availabilityStatus DEFAULT 'IN_STOCK'`, `isPurchasable DEFAULT true`, `approvalStatus DEFAULT 'APPROVED'`, `priceConfidence DEFAULT 'HIGH'`, plus `priceCents`, `compareAtPriceCents`, `unitPriceCents`, `costPrice`, `marketPrice`, `marketSource`, `packageQuantity`, `taxCategory`, `isActive`, `priceApprovedAt`, `priceUpdatedAt`. Every pre-existing product row therefore became "APPROVED, purchasable, 100 in stock, HIGH confidence" the moment the push ran.
- DeliveryZone gained `orderCutoffHour 14`, `deliveryDays`, `maxDailyOrders 30` defaults; existing `freeDeliveryMinSpend 150` / `minOrderAmount 50` defaults and the seed's `deliveryFee 9.99` are invented business values.
- Order gained `customerId`, `deliverySuburb`, `gstTotal`, `preferredDeliveryDate`, `stripePaymentIntentId`, `stripeSessionId` (unique), `totalCents DEFAULT 0`; `storeBranchId` became nullable (FK dropped and re-added `ON DELETE SET NULL`); `paymentMethod DEFAULT 'STRIPE'`.
- New tables: `ProductPriceHistory`, `MarketPriceReference`, `Customer`, `OrderItem`, `PaymentEvent`, `AdminAuditLog`, `DeliverySetting`.
- `scripts/sync-catalogue-to-db.mjs` (old version) read `.env.local` directly, hard-coded `stockQuantity: 150`, `costPrice` from a dataset, `priceConfidence "HIGH"`, and set `isPurchasable`/`APPROVED` from the pricing dataset, with a competitor price as `compareAtPrice`. Evidence of fabricated data to look for in any DB it touched: stock exactly 100 or 150, `approvalStatus='APPROVED'` with no approver, `costPrice` near 65% of price, delivery zones at 9.99 / 150 / 50.
- `prisma/seed.ts` (old) wrote invented prices, specials and the 9.99 / 150 / 50 zones (it was already guarded to localhost).

## 2. Which database is it? (do this before anything else)

Production uses Supabase project `asjjj...`; `.env.local` on the dev machine points at project `idzicz...`. Never assume; check identity without reading secrets:

- Compare the host/project ref only. `scripts/db-guard.mjs` (`describeDatabaseUrl`) prints `host:port/db project=<ref>` and never prints passwords. Direct host form is `db.<ref>.supabase.co`; pooler form is user `postgres.<ref>` on `*.pooler.supabase.com`.
- In Vercel, check which project ref the Production `DATABASE_URL` / `POSTGRES_PRISMA_URL` variables contain (dashboard shows the host; do not copy values). If production and `.env.local` refs differ they are different databases; if the same, the dev-machine scripts wrote to production.
- Signature of a `db push` database: it has the Antigravity columns but NO `_prisma_migrations` table. Read-only probe (run with `ALLOW_REMOTE_DB_READ=yes-i-approved` via `psql` or the report script):

```sql
SELECT to_regclass('_prisma_migrations') AS migrations_table,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Product' AND column_name='stockQuantity')  AS has_antigravity_columns,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Product' AND column_name='stockVerified')  AS has_0002;
```

- `node scripts/db-reconcile-report.mjs --md` (read-only, `SET TRANSACTION READ ONLY`) counts the fabricated-data fingerprints and works before and after the migration. Remote use needs `ALLOW_REMOTE_DB_READ=yes-i-approved`. NOT RUN against any remote DB.

## 3. Backup first (required before any remote change)

Use the direct (non-pooler) connection and a `pg_dump` at least as new as the server (local client is 18.6):

```bash
pg_dump -Fc --no-owner --no-privileges "$DIRECT_DATABASE_URL" -f fresh-stop-$(date +%Y%m%d-%H%M).dump
# verify by restoring into the disposable DB, never into the source:
node scripts/db-local.mjs start
psql -h localhost -p 54329 -U fs_dev -d postgres -c 'create database fresh_stop_restore_check'
pg_restore --no-owner --no-privileges -h localhost -p 54329 -U fs_dev -d fresh_stop_restore_check fresh-stop-*.dump
# compare row counts of Product, Order, OrderItem, DeliveryZone, PaymentEvent between source and restore
```

Tested: a dump/restore round trip of the disposable DB gave identical content checksums (counts plus column hashes for 5 tables). Supabase-specific schemas (`auth`, `storage`) are not needed; only `public` is used.

## 4. Baseline and apply (existing `db push` database)

`prisma/migrations/0_init` is the schema as of commit `d88ad89` (Antigravity's, as already deployed). `20261020000000_commerce_fail_closed` is additive: new columns, one new table, new indexes, and default changes only (SET/DROP DEFAULT). It contains no data updates, so existing rows are untouched.

```bash
# 1. confirm the live schema equals 0_init (read-only, exit code 0 = identical)
git show d88ad89:prisma/schema.prisma > baseline.prisma
npx prisma migrate diff --from-url "$DIRECT_DATABASE_URL" --to-schema-datamodel baseline.prisma --exit-code
# 2. mark 0_init as already applied (no SQL is run)
DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx prisma migrate resolve --applied 0_init
# 3. apply 0002
npx prisma migrate deploy
```

Run on the disposable DB: a database created from `0_init` SQL with no `_prisma_migrations` is refused by `migrate deploy` ("schema is not empty"), `migrate resolve --applied 0_init` fixes that, then `migrate deploy` applied only `20261020000000_commerce_fail_closed` and `migrate status` reported up to date. A fresh DB simply runs `npx prisma migrate deploy` (both migrations). `DATABASE_URL_UNPOOLED` (directUrl) must be the direct connection for migrations.

Proven on the disposable DB (0_init, fabricated-looking fixture `prisma/manual/fixture-antigravity-lookalike.sql`, then 0002): per-table row counts and content checksums for Product, Order, OrderItem, DeliveryZone and PaymentEvent were identical before and after 0002, and `prisma migrate diff` from the migrated DB to `schema.prisma` was empty.

Effect on old rows after 0002 alone: they still say `APPROVED`, `isPurchasable true`, stock 100/150, but they are NOT sellable because the purchasable rule also needs `priceApprovedBy`, `stockVerified` and `stockQuantity - reservedQuantity >= qty`. New rows default to `PENDING`, not purchasable, stock `NULL`, `UNKNOWN`. Behaviour change for code: `DeliveryZone.freeDeliveryMinSpend`/`minOrderAmount` lost their defaults (still NOT NULL), so any code creating a zone must supply them; deprecated columns are unused by the new config.

## 5. Opt-in reset of fabricated data (human approval required)

`prisma/manual/reset-unverified-commerce-data.sql` clears only rows matching the fingerprints (see file header): fabricated stock, auto-approved prices (price preserved as `suggestedPriceCents`), `costPrice`, HIGH confidence/IN_STOCK without verification, and deactivates unapproved delivery zones. It never touches orders. It copies affected products to `reset_backup_unverified_product` first and refuses to run twice.

```bash
psql "$URL" -v ON_ERROR_STOP=1 -f prisma/manual/reset-unverified-commerce-data.sql                      # dry run: prints before/after, ROLLBACK
psql "$URL" -v ON_ERROR_STOP=1 -v approved_by="Name" -v backup_verified=yes -f prisma/manual/reset-unverified-commerce-data.sql   # commits
```

Disposable-DB result (10 products, 2 zones, 2 orders): before / after = products with stock 9 / 1 (the remaining one is an unverified odd value, 37, which is non-sellable because `stockVerified=false`), APPROVED-without-approver 8 / 0, costPrice 8 / 0, isPurchasable 10 / 0, active zones 2 / 0. Orders 2 / 2 and Order/OrderItem/PaymentEvent checksums unchanged. Dry run changed nothing. Omitting `backup_verified=yes` also rolls back. Restore individual products from `reset_backup_unverified_product` if needed.

## 6. Rollback of 0002

`prisma/manual/rollback-0002.sql` reverses 0002 (drops the added columns/table/index, restores the old defaults, removes the `_prisma_migrations` row). It refuses to run if new-column data exists unless `-v force=yes`, and is a dry run unless `-v apply=yes`. Restoring the old defaults re-enables the unsafe behaviour, so use it only to get back to a pre-0002 application build. Tested on a clone of the migrated disposable DB: dry run, refusal path (with a reservation row), commit, then `prisma migrate diff` from the rolled-back DB to the `0_init` schema was empty, counts and checksums matched the pre-0002 snapshot, and `migrate deploy` re-applied 0002 cleanly. A pg_dump restore is the safer rollback for anything after data has been written.

## 7. Scripts and guards

- `npm run db:local -- start|stop|status|reset` manages the disposable DB (data in `~/fresh-stop-pgdata`, outside the repo). `reset` drops/recreates `fresh_stop_dev` only.
- `scripts/db-guard.mjs`: seed, sync, import, image-update, export and schema-audit scripts refuse non-local `DATABASE_URL*` hosts unless `ALLOW_REMOTE_DB_WRITE=yes-i-approved` (writes) or `ALLOW_REMOTE_DB_READ=yes-i-approved` (reports). Tested: remote hosts are refused for `prisma/seed.ts` and `sync-catalogue-to-db.mjs`.
- `prisma/seed.ts` now seeds branches, categories and unpriced PENDING products only (no prices, stock or delivery zones). `sync-catalogue-to-db.mjs` is dry-run by default, never reads `.env.local`, writes pricing-dataset prices only as `suggestedPriceCents`, creates no BranchInventory rows, and never overwrites approved prices/stock. Tested on the disposable DB: 172 products created, all `PENDING`/`UNKNOWN`, 0 with price, stock, purchasable or costPrice.
- Not changed (not in scope): `.gitignore` ignores `.env*` (only `.env.example` is excepted), so `.env.test.example` needs `!.env.test.example` added before it can be committed.
