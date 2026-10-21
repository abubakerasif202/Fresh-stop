-- Keep approval actor and timestamp together so every approval is auditable.
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_tax_approval_actor_timestamp_pair"
  CHECK (("taxCategoryApprovedBy" IS NULL) = ("taxCategoryApprovedAt" IS NULL));
