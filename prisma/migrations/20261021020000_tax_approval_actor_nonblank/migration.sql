-- Audit actor must be a real, nonblank identity whenever tax approval is present.
ALTER TABLE "Product"
  DROP CONSTRAINT "Product_tax_approval_actor_timestamp_pair",
  ADD CONSTRAINT "Product_tax_approval_actor_timestamp_pair"
  CHECK (("taxCategoryApprovedBy" IS NULL) = ("taxCategoryApprovedAt" IS NULL)
    AND ("taxCategoryApprovedBy" IS NULL OR length(btrim("taxCategoryApprovedBy")) > 0));
