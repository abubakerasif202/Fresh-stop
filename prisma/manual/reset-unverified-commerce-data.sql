-- ============================================================================
-- OPT-IN RESET OF UNVERIFIED COMMERCE DATA.  *** REQUIRES HUMAN APPROVAL ***
--
-- DO NOT RUN against any shared / production database without:
--   1. a verified pg_dump backup (see docs/DATABASE_MIGRATION.md),
--   2. migration 20261020000000_commerce_fail_closed already applied,
--   3. explicit approval from the business owner.
--
-- What it does (only rows matching the unverified-data fingerprints):
--   * Product stock 100/150 never counted by a human (stockVerified=false)
--       -> stockQuantity NULL, availabilityStatus UNKNOWN
--   * Product APPROVED with no priceApprovedBy (auto-approved by a script)
--       -> approvalStatus PENDING, isPurchasable false, priceConfidence NULL,
--          priceApprovedAt NULL; the old price is preserved in suggestedPriceCents
--          (priceSource SUGGESTED) and then priceCents/price/unitPriceCents are cleared
--   * Product isPurchasable true with no priceApprovedBy -> false
--   * Product priceConfidence set without an approver -> NULL; IN_STOCK status without
--     verified stock -> UNKNOWN
--   * Product costPrice (fabricated, never used) -> NULL
--   * DeliveryZone not admin-approved -> isActive false (delivery fails closed)
-- It never touches Orders, OrderItems, PaymentEvents, Customers or branches.
-- Every affected Product row is first copied to reset_backup_unverified_product
-- (the statement fails if that table already exists, so a backup is never overwritten).
--
-- USAGE (psql only):
--   DRY RUN (default; shows before/after counts, then ROLLBACK):
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/manual/reset-unverified-commerce-data.sql
--   APPLY (commits; both variables are mandatory):
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--          -v approved_by="Owner Name" -v backup_verified=yes \
--          -f prisma/manual/reset-unverified-commerce-data.sql
-- ============================================================================
\if :{?approved_by}
\else
  \set approved_by DRY_RUN
\endif
\if :{?backup_verified}
\else
  \set backup_verified no
\endif
SELECT (:'approved_by' <> 'DRY_RUN' AND :'backup_verified' = 'yes') AS do_commit \gset

\echo '--- target database ---'
SELECT current_database() AS database, inet_server_addr() AS server_addr, inet_server_port() AS port;

BEGIN;

CREATE TABLE reset_backup_unverified_product AS
SELECT * FROM "Product"
WHERE ("stockQuantity" IN (100, 150) AND NOT "stockVerified")
   OR ("approvalStatus" = 'APPROVED' AND "priceApprovedBy" IS NULL)
   OR "costPrice" IS NOT NULL;

CREATE TEMP TABLE reset_counts(phase text, products_with_stock int, approved_no_approver int, cost_price int, purchasable int, active_zones int);

INSERT INTO reset_counts SELECT 'before',
  (SELECT count(*) FROM "Product" WHERE "stockQuantity" IS NOT NULL),
  (SELECT count(*) FROM "Product" WHERE "approvalStatus" = 'APPROVED' AND "priceApprovedBy" IS NULL),
  (SELECT count(*) FROM "Product" WHERE "costPrice" IS NOT NULL),
  (SELECT count(*) FROM "Product" WHERE "isPurchasable"),
  (SELECT count(*) FROM "DeliveryZone" WHERE "isActive");

UPDATE "Product"
SET "stockQuantity" = NULL, "availabilityStatus" = 'UNKNOWN', "updatedAt" = now()
WHERE "stockQuantity" IN (100, 150) AND NOT "stockVerified";

UPDATE "Product"
SET "suggestedPriceCents" = COALESCE("suggestedPriceCents", "priceCents", round("price" * 100)::int),
    "priceSource" = CASE WHEN COALESCE("priceCents", "price") IS NOT NULL OR "suggestedPriceCents" IS NOT NULL THEN 'SUGGESTED' ELSE "priceSource" END,
    "priceCents" = NULL,
    "price" = NULL,
    "unitPriceCents" = NULL,
    "approvalStatus" = 'PENDING',
    "isPurchasable" = false,
    "priceConfidence" = NULL,
    "priceApprovedAt" = NULL,
    "updatedAt" = now()
WHERE "approvalStatus" = 'APPROVED' AND "priceApprovedBy" IS NULL;

UPDATE "Product" SET "isPurchasable" = false, "updatedAt" = now() WHERE "isPurchasable" AND "priceApprovedBy" IS NULL;

UPDATE "Product" SET "priceConfidence" = NULL, "updatedAt" = now() WHERE "priceConfidence" IS NOT NULL AND "priceApprovedBy" IS NULL;

UPDATE "Product" SET "availabilityStatus" = 'UNKNOWN', "updatedAt" = now() WHERE "availabilityStatus" = 'IN_STOCK' AND NOT "stockVerified";

UPDATE "Product" SET "costPrice" = NULL, "updatedAt" = now() WHERE "costPrice" IS NOT NULL;

UPDATE "DeliveryZone" SET "isActive" = false WHERE NOT "isApproved";

INSERT INTO reset_counts SELECT 'after',
  (SELECT count(*) FROM "Product" WHERE "stockQuantity" IS NOT NULL),
  (SELECT count(*) FROM "Product" WHERE "approvalStatus" = 'APPROVED' AND "priceApprovedBy" IS NULL),
  (SELECT count(*) FROM "Product" WHERE "costPrice" IS NOT NULL),
  (SELECT count(*) FROM "Product" WHERE "isPurchasable"),
  (SELECT count(*) FROM "DeliveryZone" WHERE "isActive");

INSERT INTO "AdminAuditLog"(id, action, "entityType", details, "adminUser", "afterJson")
SELECT gen_random_uuid()::text, 'RESET_UNVERIFIED_COMMERCE_DATA', 'Product',
       'backup table reset_backup_unverified_product',
       :'approved_by',
       (SELECT json_agg(r)::text FROM reset_counts r);

\echo '--- before / after ---'
SELECT * FROM reset_counts ORDER BY phase DESC;
SELECT 'orders_untouched' AS check, count(*) AS orders FROM "Order";

\if :do_commit
  \echo 'APPROVED: committing'
  COMMIT;
\else
  \echo 'DRY RUN (or approved_by / backup_verified=yes missing): ROLLBACK, no changes persisted'
  ROLLBACK;
\endif
