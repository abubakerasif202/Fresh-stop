-- REVIEW ONLY. Do not execute without explicit owner approval of this database change.
-- Adds catalogue publication metadata and permits unconfirmed prices/units.
-- Existing products retain their data and are visible by default, matching Prisma.
-- No products, candidates, stock, prices, orders or store records are inserted/updated/deleted.
-- Configure DATABASE_URL and DATABASE_URL_UNPOOLED separately in the deployment.
-- After an approved application, run: npx tsx scripts/check-database-schema.ts
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS "imageAlt" TEXT,
  ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- Abort instead of coercing unexpected pre-existing columns or changing existing flags.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product'
      AND column_name = 'imageAlt' AND udt_name = 'text' AND is_nullable = 'YES'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product'
      AND column_name = 'isPublished' AND udt_name = 'bool' AND is_nullable = 'NO'
      AND column_default = 'true'
  ) THEN
    RAISE EXCEPTION 'Unexpected Product catalogue columns; review schema before proceeding';
  END IF;
END $$;

ALTER TABLE public."Product"
  ALTER COLUMN "price" DROP NOT NULL,
  ALTER COLUMN "unit" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "Product_isPublished_idx" ON public."Product" ("isPublished");
COMMIT;
