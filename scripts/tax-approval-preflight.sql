-- Read-only report for the existing Supabase-bridged production schema.
-- This does not apply migrations or populate Prisma's migration history.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';

DO $preflight$
DECLARE
  approval_columns integer;
  invalid_rows bigint;
  approved_rows bigint;
BEGIN
  SELECT count(*) INTO approval_columns FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Product'
    AND column_name IN ('taxCategoryApprovedBy', 'taxCategoryApprovedAt');
  IF approval_columns = 1 THEN
    RAISE EXCEPTION 'Partial tax approval schema; stop before migration or deployment';
  ELSIF approval_columns = 2 THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
       AND table_name='Product' AND column_name='taxCategoryApprovedBy' AND data_type='text' AND is_nullable='YES')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
       AND table_name='Product' AND column_name='taxCategoryApprovedAt' AND data_type='timestamp without time zone' AND is_nullable='YES') THEN
      RAISE EXCEPTION 'Unexpected tax approval column types/nullability';
    END IF;
    EXECUTE 'SELECT count(*) FILTER (WHERE ("taxCategoryApprovedBy" IS NULL) <> ("taxCategoryApprovedAt" IS NULL)
                OR ("taxCategoryApprovedBy" IS NOT NULL AND "taxCategoryApprovedBy" !~ ''[^[:space:]]'')),
                    count(*) FILTER (WHERE "taxCategoryApprovedBy" IS NOT NULL AND "taxCategoryApprovedAt" IS NOT NULL)
             FROM public."Product"' INTO invalid_rows, approved_rows;
    RAISE NOTICE 'Tax approval rows: approved=%, invalid=%', approved_rows, invalid_rows;
    IF invalid_rows <> 0 THEN RAISE EXCEPTION 'Invalid tax approval metadata; stop'; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public."Product"'::regclass
      AND conname='Product_tax_approval_actor_timestamp_pair' AND convalidated
      AND pg_get_constraintdef(oid) = $definition$CHECK (((("taxCategoryApprovedBy" IS NULL) = ("taxCategoryApprovedAt" IS NULL)) AND (("taxCategoryApprovedBy" IS NULL) OR ("taxCategoryApprovedBy" ~ '[^[:space:]]'::text))))$definition$) THEN
      RAISE EXCEPTION 'Final tax approval constraint is absent, unvalidated or different; stop';
    END IF;
  END IF;
END
$preflight$;

SELECT current_database() AS database_name,
       to_regclass('public._prisma_migrations') AS prisma_history;
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Product'
  AND column_name IN ('taxCategory', 'taxCategoryApprovedBy', 'taxCategoryApprovedAt')
ORDER BY column_name;
SELECT CASE count(*) WHEN 0 THEN 'NEEDS_ADDITIVE_TAX_MIGRATION'
                    WHEN 2 THEN 'CHECK_TYPES_CONSTRAINT_AND_DATA'
                    ELSE 'STOP_PARTIAL_SCHEMA' END AS tax_schema_state
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Product'
  AND column_name IN ('taxCategoryApprovedBy', 'taxCategoryApprovedAt');
SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public."Product"'::regclass
  AND conname = 'Product_tax_approval_actor_timestamp_pair';
SELECT count(*) AS product_count,
       count(*) FILTER (WHERE "taxCategory" IS NULL OR "taxCategory" NOT IN ('GST_FREE', 'TAXABLE_10')) AS tax_labels_needing_review
FROM public."Product";
SELECT coalesce((SELECT value = 'true' FROM public."DeliverySetting"
                 WHERE key = 'paidCheckoutApproved'), false) AS checkout_database_approved;
COMMIT;
