-- Production legacy bridge: asjjjivkmugbcruzdhju only.
-- Generated from the restore-verified 20 October 2026 public-schema backup.
-- Preserve all existing rows and original values. New commerce flags fail closed.
-- Requires private logical backup + verified local restore before execution.
-- The only removed object is an immediately replaced Order foreign-key constraint.
-- No tables, columns or rows are deleted. Existing RLS is preserved.
BEGIN;
SET LOCAL search_path=public,pg_catalog;
SET LOCAL lock_timeout='5s';
LOCK TABLE "StoreBranch","Category","Product","Order","BranchInventory","DeliveryZone" IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') <> 6
 OR EXISTS (SELECT 1 FROM (VALUES ('BranchInventory',4),('Category',6),('DeliveryZone',8),('Order',20),('Product',15),('StoreBranch',14)) expected(name,n) WHERE (SELECT count(*) FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=expected.name) <> expected.n)
 OR to_regclass('public."InventoryReservation"') IS NOT NULL
 OR (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='Product') <> 15
 OR (SELECT count(*) FROM "Product") <> 172
 OR EXISTS (SELECT 1 FROM "Order")
 THEN RAISE EXCEPTION 'Unexpected legacy schema or order activity; stop and re-audit'; END IF;
END $$;

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_storeBranchId_fkey";

-- AlterTable
ALTER TABLE "DeliveryZone" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "deliveryDays" TEXT,
ADD COLUMN     "deliveryFeeCents" INTEGER,
ADD COLUMN     "freeDeliveryMinCents" INTEGER,
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxDailyOrders" INTEGER,
ADD COLUMN     "minOrderCents" INTEGER,
ADD COLUMN     "orderCutoffHour" INTEGER,
ALTER COLUMN "freeDeliveryMinSpend" DROP DEFAULT,
ALTER COLUMN "minOrderAmount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "accessTokenHash" TEXT,
ADD COLUMN     "amountPaidCents" INTEGER,
ADD COLUMN     "businessEmailClaimedAt" TIMESTAMP(3),
ADD COLUMN     "businessEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "confirmationEmailClaimedAt" TIMESTAMP(3),
ADD COLUMN     "confirmationEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'aud',
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "deliverySuburb" TEXT,
ADD COLUMN     "emailAccessIssuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "emailRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gstTotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "preferredDeliveryDate" TEXT,
ADD COLUMN     "refundedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT,
ADD COLUMN     "totalCents" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "storeBranchId" DROP NOT NULL,
ALTER COLUMN "paymentMethod" SET DEFAULT 'STRIPE';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "availabilityStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "compareAtApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "compareAtPriceCents" INTEGER,
ADD COLUMN     "costPrice" DOUBLE PRECISION,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isPurchasable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketPrice" DOUBLE PRECISION,
ADD COLUMN     "marketSource" TEXT,
ADD COLUMN     "maxOrderQuantity" INTEGER,
ADD COLUMN     "packageQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "priceApprovedAt" TIMESTAMP(3),
ADD COLUMN     "priceApprovedBy" TEXT,
ADD COLUMN     "priceCents" INTEGER,
ADD COLUMN     "priceConfidence" TEXT,
ADD COLUMN     "priceSource" TEXT,
ADD COLUMN     "priceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockQuantity" INTEGER,
ADD COLUMN     "stockVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suggestedPriceCents" INTEGER,
ADD COLUMN     "taxCategory" TEXT NOT NULL DEFAULT 'GST_FREE',
ADD COLUMN     "unitPriceCents" INTEGER;

-- CreateTable
CREATE TABLE "ProductPriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oldPriceCents" INTEGER,
    "newPriceCents" INTEGER NOT NULL,
    "changedBy" TEXT NOT NULL DEFAULT 'admin',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPriceReference" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "competitor" TEXT NOT NULL,
    "productName" TEXT,
    "packSize" TEXT,
    "observedPrice" DOUBLE PRECISION NOT NULL,
    "unitPrice" TEXT,
    "sourceUrl" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "MarketPriceReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "taxCategory" TEXT NOT NULL DEFAULT 'GST_FREE',
    "taxCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "payload" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "stripeObjectId" TEXT,
    "livemode" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "adminUser" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverySetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverySetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPriceHistory_productId_idx" ON "ProductPriceHistory"("productId");

-- CreateIndex
CREATE INDEX "MarketPriceReference_productId_idx" ON "MarketPriceReference"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_stripeEventId_key" ON "PaymentEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "PaymentEvent_stripeEventId_idx" ON "PaymentEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliverySetting_key_key" ON "DeliverySetting"("key");

-- CreateIndex
CREATE INDEX "InventoryReservation_status_expiresAt_idx" ON "InventoryReservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "InventoryReservation_productId_idx" ON "InventoryReservation"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReservation_orderId_productId_key" ON "InventoryReservation"("orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Product_approvalStatus_idx" ON "Product"("approvalStatus");

-- CreateIndex
CREATE INDEX "Product_isPurchasable_idx" ON "Product"("isPurchasable");

-- AddForeignKey
ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketPriceReference" ADD CONSTRAINT "MarketPriceReference_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeBranchId_fkey" FOREIGN KEY ("storeBranchId") REFERENCES "StoreBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- New tables remain private to the server database role; no public API policies.
ALTER TABLE "ProductPriceHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketPriceReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeliverySetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryReservation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ProductPriceHistory","MarketPriceReference","Customer","OrderItem","PaymentEvent","AdminAuditLog","DeliverySetting","InventoryReservation" FROM PUBLIC;
DO $$ DECLARE api_role text; BEGIN
 FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
   EXECUTE format('REVOKE ALL ON "ProductPriceHistory","MarketPriceReference","Customer","OrderItem","PaymentEvent","AdminAuditLog","DeliverySetting","InventoryReservation" FROM %I',api_role);
  END IF;
 END LOOP;
END $$;
COMMIT;
