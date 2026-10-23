-- Fresh Stop: READ-ONLY pre-flight for the Enquiry migration.
-- Run in the Supabase SQL Editor of the Fresh Stop production project
-- (documented ref: asjjjivkmugbcruzdhju, ap-southeast-2). Changes nothing.
-- Expected: is_fresh_stop = true, enquiry_table = null, enquiry_enums = 0,
-- migrations_table = null (production is managed by manual SQL, not `prisma migrate deploy`).
SET TRANSACTION READ ONLY;
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Product' AND column_name='slug')            AS is_fresh_stop,
  (SELECT count(*) FROM "Product")                                                                                                       AS products,
  (SELECT count(*) FROM "Order")                                                                                                         AS orders,
  (SELECT count(*) FROM "Customer")                                                                                                      AS customers,
  to_regclass('public."Enquiry"')                                                                                                        AS enquiry_table,
  (SELECT count(*) FROM pg_type WHERE typname IN ('EnquiryKind','EnquiryStatus'))                                                        AS enquiry_enums,
  to_regclass('public._prisma_migrations')                                                                                               AS migrations_table;
-- Record products / orders / customers now; re-run after the migration: they must be identical.
