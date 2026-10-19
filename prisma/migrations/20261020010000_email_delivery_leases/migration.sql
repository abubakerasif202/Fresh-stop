ALTER TABLE "Order"
  ADD COLUMN "confirmationEmailClaimedAt" TIMESTAMP(3),
  ADD COLUMN "businessEmailClaimedAt" TIMESTAMP(3),
  ADD COLUMN "emailRevision" INTEGER NOT NULL DEFAULT 0;
