-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "compareAtApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxOrderQuantity" INTEGER,
ADD COLUMN     "priceApprovedBy" TEXT,
ADD COLUMN     "priceSource" TEXT,
ADD COLUMN     "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suggestedPriceCents" INTEGER,
ALTER COLUMN "stockQuantity" DROP DEFAULT,
ALTER COLUMN "availabilityStatus" SET DEFAULT 'UNKNOWN',
ALTER COLUMN "isPurchasable" SET DEFAULT false,
ALTER COLUMN "approvalStatus" SET DEFAULT 'PENDING',
ALTER COLUMN "priceConfidence" DROP DEFAULT;
-- AlterTable
ALTER TABLE "DeliveryZone" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "deliveryFeeCents" INTEGER,
ADD COLUMN     "freeDeliveryMinCents" INTEGER,
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minOrderCents" INTEGER,
ALTER COLUMN "freeDeliveryMinSpend" DROP DEFAULT,
ALTER COLUMN "minOrderAmount" DROP DEFAULT,
ALTER COLUMN "orderCutoffHour" DROP DEFAULT,
ALTER COLUMN "deliveryDays" DROP DEFAULT,
ALTER COLUMN "maxDailyOrders" DROP DEFAULT;
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "accessTokenHash" TEXT,
ADD COLUMN     "amountPaidCents" INTEGER,
ADD COLUMN     "businessEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "confirmationEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'aud',
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "refundedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeAccountId" TEXT;
-- AlterTable
ALTER TABLE "PaymentEvent" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "livemode" BOOLEAN,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "stripeObjectId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PROCESSING';
-- AlterTable
ALTER TABLE "AdminAuditLog" ADD COLUMN     "afterJson" TEXT,
ADD COLUMN     "beforeJson" TEXT;
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
CREATE INDEX "InventoryReservation_status_expiresAt_idx" ON "InventoryReservation"("status", "expiresAt");
-- CreateIndex
CREATE INDEX "InventoryReservation_productId_idx" ON "InventoryReservation"("productId");
-- CreateIndex
CREATE UNIQUE INDEX "InventoryReservation_orderId_productId_key" ON "InventoryReservation"("orderId", "productId");
-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
