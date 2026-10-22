-- Preserve the fulfilment policy of each order line independently of later product edits.
ALTER TABLE "InventoryReservation" ADD COLUMN "isBackorder" BOOLEAN NOT NULL DEFAULT false;
