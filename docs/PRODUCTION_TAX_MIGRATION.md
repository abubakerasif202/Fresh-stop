# Production tax-approval migration — 22 October 2026

## Current verdict

**Prepared and locally rehearsed; not applied to production.** Website release is approved, but the release still requires an isolated Preview database with passing runtime checks and a current recoverable production backup. Checkout must remain disabled throughout.

Authenticated Supabase inspection of `asjjjivkmugbcruzdhju` confirmed:

- Healthy production project, PostgreSQL 17; 172 products, all existing tax labels recognized. A label is not business approval.
- The only missing Prisma scalar columns are `Product.taxCategoryApprovedBy` and `Product.taxCategoryApprovedAt`. Existing scalar data types match the generated client.
- Neither new column nor its integrity constraint exists. Existing `Product` constraints are its primary key and category foreign key.
- No `public._prisma_migrations` table. The actual Supabase history is `20261015183626 init_fresh_stop_schema`, `20261015225353 unpriced_products_and_publish_flag`, and `20261019195554 fresh_stop_safe_commerce_bridge_20261020`.
- No `paidCheckoutApproved` setting row; the application treats absence as disabled.

**Do not run `prisma migrate deploy` on this bridged database, replay `0_init`, or fabricate Prisma history.** The historical bridge already covers the earlier commerce/email schema.

## Additive release procedure

1. Confirm the project reference `asjjjivkmugbcruzdhju` in the authenticated Supabase interface before executing SQL; `current_database()` alone does not identify a Supabase project. Run [the read-only tax-specific preflight](../scripts/tax-approval-preflight.sql). Separately compare all generated Prisma scalar columns against `information_schema.columns`, as performed in this continuation; the tax preflight alone does not cover other application fields. Stop for missing unrelated fields, partial tax columns, unexpected types, invalid approval metadata or a conflicting constraint.
2. Capture a current private logical backup of the production database using the owner's approved backup mechanism. Restore it into an isolated disposable target and verify schema, row counts and affected-table checksums. A local synthetic backup rehearsal does not establish production backup recoverability.
3. Verify this exact code and the new schema together on the authorised isolated Preview database. Existing generic Preview database secret entries are present but their values cannot be exported by Vercel; there is no verified isolated target yet.
4. With those prerequisites satisfied, concatenate the following four repository migration files, unchanged and in order, into **one transaction**, with `SET LOCAL lock_timeout='5s'` and `SET LOCAL statement_timeout='30s'`. Apply through Supabase's authenticated migration mechanism under a clearly named additive bridge migration, recording the actual executed SQL in Supabase history:
   - `20261021000000_tax_classification_approval`
   - `20261021010000_tax_approval_audit_pair`
   - `20261021020000_tax_approval_actor_nonblank`
   - `20261021030000_tax_approval_whitespace_actor`
5. Verify both nullable columns, the validated final actor/timestamp check, unchanged existing-column checksums/counts and RLS, and null approvals for existing products. Recheck checkout environment and database disablement before deploying.

The migrations add nullable metadata, then enforce a paired timestamp and a non-whitespace actor. They do not set tax choices, approve products, update prices or stock, or delete records. The last constraint replaces the preceding intermediate definitions.

## Rehearsal actually performed

Reconstructed the public schema from the three actual Supabase migration-history statements on local PostgreSQL 18.6 at port 54329; production is PostgreSQL 17.11. Inserted **172 synthetic products only in that local fixture**, to satisfy the original bridge's historical preflight. Dumped the bridged fixture with `pg_dump -Fc`, restored it using `pg_restore --exit-on-error`, then applied the four exact repository migrations transactionally to the restored database.

Results: 172/172 existing product rows preserved by an ordered JSON checksum excluding only the two new fields; 172/172 remained unapproved; whitespace-only approval actors and actors without timestamps were rejected; the final constraint was validated; Product RLS remained enabled. The rehearsal's schema and database backup are local synthetic evidence, not a production backup. Private local artifacts are under ignored `artifacts/stripe-live/`.

The read-only preflight also passed against actual production's missing-column state. Its migrated-column branch passed locally. Its exact constraint-definition comparison deliberately stops on a differently formatted PostgreSQL definition; inspect semantics rather than bypassing a stop when rechecking on PostgreSQL 17. A same-version production-backup restore remains part of the final release gate.

## Rollback

Before commit, an error or lock timeout rolls back the entire additive transaction. After commit, retain the nullable columns and constraint and restore the preceding approved application deployment with checkout closed. Do not drop columns, remove approvals, reset the database or delete orders. Continue signed-webhook processing for existing sessions. Restore data from backup only under a separately reviewed recovery procedure if actual corruption is established.
