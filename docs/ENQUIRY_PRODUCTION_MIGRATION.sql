-- Fresh Stop: Enquiry table (wholesale + contact enquiries). REVIEWED PRODUCTION SCRIPT.
-- Production has NO _prisma_migrations table: apply this manually (Supabase SQL editor or psql), once,
-- AFTER a verified backup and BEFORE deploying the application build that serves /api/enquiries.
-- Additive only: creates 2 enums, 1 table, 2 indexes. Touches no existing object. Re-running fails safely
-- (CREATE TYPE/TABLE error inside the transaction, nothing is changed).
-- Rollback (only if no enquiries must be kept): DROP TABLE "Enquiry"; DROP TYPE "EnquiryStatus"; DROP TYPE "EnquiryKind";
-- Mirrors prisma/migrations/20261023000000_add_enquiry/migration.sql.
BEGIN;
CREATE TYPE "EnquiryKind" AS ENUM ('WHOLESALE', 'CONTACT');
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "kind" "EnquiryKind" NOT NULL,
    "name" TEXT NOT NULL,
    "businessName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "products" TEXT,
    "estimatedQuantity" TEXT,
    "message" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "emailClaimedAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Enquiry_status_createdAt_idx" ON "Enquiry"("status", "createdAt");
CREATE INDEX "Enquiry_kind_createdAt_idx" ON "Enquiry"("kind", "createdAt");

-- Match the other server-only tables: RLS on with no policies, no direct API-role access.
ALTER TABLE "Enquiry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Enquiry" FROM PUBLIC;
DO $$ DECLARE api_role text; BEGIN
 FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
   EXECUTE format('REVOKE ALL ON "Enquiry" FROM %I',api_role);
  END IF;
 END LOOP;
END $$;
COMMIT;
