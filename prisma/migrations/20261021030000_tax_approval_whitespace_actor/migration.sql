-- Match the runtime's whitespace trim when validating the approval actor.
ALTER TABLE "Product"
  DROP CONSTRAINT "Product_tax_approval_actor_timestamp_pair",
  ADD CONSTRAINT "Product_tax_approval_actor_timestamp_pair"
  CHECK (("taxCategoryApprovedBy" IS NULL) = ("taxCategoryApprovedAt" IS NULL)
    AND ("taxCategoryApprovedBy" IS NULL OR "taxCategoryApprovedBy" ~ '[^[:space:]]'));
