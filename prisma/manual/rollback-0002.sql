-- ============================================================================
-- ROLLBACK of migration 20261020000000_commerce_fail_closed  (back to 0_init shape)
--
-- Only for emergencies. This DROPS the columns/table that migration added, so any data
-- written into them (stockVerified, reservations, accessTokenHash, paidAt, ...) is lost.
-- Take a pg_dump first. It also restores the OLD unsafe column defaults (stock 100,
-- APPROVED, IN_STOCK, isPurchasable true...) because that is what 0_init looked like.
-- After rolling back, deploy only code that matches the 0_init schema.
--
-- Safety: refuses to run if new-column data exists (reservations, access tokens, paid
-- orders, verified stock, approved zones/prices) unless -v force=yes is passed.
-- Dry run by default (ROLLBACK); add -v apply=yes to commit.
--
--   dry run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/manual/rollback-0002.sql
--   commit : psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v apply=yes [-v force=yes] -f prisma/manual/rollback-0002.sql
-- ============================================================================
\if :{?apply}
\else
  \set apply no
\endif
SELECT (:'apply' = 'yes') AS do_commit \gset

SELECT (
  (SELECT count(*) FROM "InventoryReservation")
  + (SELECT count(*) FROM "Order" WHERE "accessTokenHash" IS NOT NULL OR "paidAt" IS NOT NULL OR "idempotencyKey" IS NOT NULL OR "refundedCents" <> 0)
  + (SELECT count(*) FROM "Product" WHERE "stockVerified" OR "priceApprovedBy" IS NOT NULL OR "reservedQuantity" <> 0)
  + (SELECT count(*) FROM "DeliveryZone" WHERE "isApproved" OR "deliveryFeeCents" IS NOT NULL)
) > 0 AS has_new_data \gset
\if :has_new_data
  \if :{?force}
    \echo 'WARNING: new-column data exists and will be destroyed (force=yes given)'
  \else
    \echo 'REFUSING: data exists in columns/tables added by 0002. Re-run with -v force=yes after a backup.'
    \quit
  \endif
\endif

BEGIN;

ALTER TABLE "InventoryReservation" DROP CONSTRAINT "InventoryReservation_orderId_fkey";
ALTER TABLE "InventoryReservation" DROP CONSTRAINT "InventoryReservation_productId_fkey";
DROP TABLE "InventoryReservation";
DROP INDEX "Order_idempotencyKey_key";

ALTER TABLE "Product"
  DROP COLUMN "compareAtApproved", DROP COLUMN "maxOrderQuantity", DROP COLUMN "priceApprovedBy",
  DROP COLUMN "priceSource", DROP COLUMN "reservedQuantity", DROP COLUMN "stockVerified",
  DROP COLUMN "suggestedPriceCents",
  ALTER COLUMN "stockQuantity" SET DEFAULT 100,
  ALTER COLUMN "availabilityStatus" SET DEFAULT 'IN_STOCK',
  ALTER COLUMN "isPurchasable" SET DEFAULT true,
  ALTER COLUMN "approvalStatus" SET DEFAULT 'APPROVED',
  ALTER COLUMN "priceConfidence" SET DEFAULT 'HIGH';

ALTER TABLE "DeliveryZone"
  DROP COLUMN "approvedAt", DROP COLUMN "approvedBy", DROP COLUMN "deliveryFeeCents",
  DROP COLUMN "freeDeliveryMinCents", DROP COLUMN "isApproved", DROP COLUMN "minOrderCents",
  ALTER COLUMN "freeDeliveryMinSpend" SET DEFAULT 150.0,
  ALTER COLUMN "minOrderAmount" SET DEFAULT 50.0,
  ALTER COLUMN "orderCutoffHour" SET DEFAULT 14,
  ALTER COLUMN "deliveryDays" SET DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat',
  ALTER COLUMN "maxDailyOrders" SET DEFAULT 30;

ALTER TABLE "Order"
  DROP COLUMN "accessTokenHash", DROP COLUMN "amountPaidCents", DROP COLUMN "businessEmailSentAt",
  DROP COLUMN "cancelledAt", DROP COLUMN "confirmationEmailSentAt", DROP COLUMN "currency",
  DROP COLUMN "idempotencyKey", DROP COLUMN "paidAt", DROP COLUMN "refundedCents",
  DROP COLUMN "stripeAccountId";

ALTER TABLE "PaymentEvent"
  DROP COLUMN "attempts", DROP COLUMN "lastError", DROP COLUMN "livemode",
  DROP COLUMN "processedAt", DROP COLUMN "stripeObjectId",
  ALTER COLUMN "status" SET DEFAULT 'PROCESSED';

ALTER TABLE "AdminAuditLog" DROP COLUMN "afterJson", DROP COLUMN "beforeJson";

-- Make Prisma's history match the rolled-back schema.
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261020000000_commerce_fail_closed';

\if :do_commit
  \echo 'COMMITTING rollback of 20261020000000_commerce_fail_closed'
  COMMIT;
\else
  \echo 'DRY RUN: ROLLBACK (pass -v apply=yes to commit)'
  ROLLBACK;
\endif
