-- Tax labels must be explicitly reviewed before products can be purchased.
-- Existing rows remain unapproved; this migration does not infer owner approval.
ALTER TABLE "Product"
  ADD COLUMN "taxCategoryApprovedBy" TEXT,
  ADD COLUMN "taxCategoryApprovedAt" TIMESTAMP(3);
