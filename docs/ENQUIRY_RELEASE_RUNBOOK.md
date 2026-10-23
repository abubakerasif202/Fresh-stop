# Enquiry release runbook (PR #16)

Status: **not merged**. Merging deploys to production at once, so the database step must come first.

## Why Prisma history needs no reconciliation
Production has no `_prisma_migrations` table and the Vercel build runs plain `next build` (no `prisma migrate deploy`). Deploys therefore never re-apply migrations. The repo copy `prisma/migrations/20261023000000_add_enquiry/migration.sql` exists for local/test databases only; `docs/ENQUIRY_PRODUCTION_MIGRATION.sql` is the same SQL for manual production use. Never run `prisma db push`, `migrate reset`, or replay `0_init` on production.

## Owner steps
1. **Identify the project.** In the Supabase account that owns Fresh Stop (organisation `bdrowtpmnxbzgpsfczyi`, project ref `asjjjivkmugbcruzdhju`, Sydney). The Claude-connected Supabase account does NOT contain it, so Claude cannot run this.
2. **Preflight.** Run `docs/PRODUCTION_ENQUIRY_PREFLIGHT.sql` in the SQL Editor. Confirm `is_fresh_stop=true`, `enquiry_table` null, `enquiry_enums` 0. Note products/orders/customers counts.
3. **Backup.** Supabase Dashboard → Database → Backups (confirm a recent one exists / take a manual one), or `pg_dump` with the direct connection string into a private file.
4. **Apply.** Run `docs/ENQUIRY_PRODUCTION_MIGRATION.sql` (one transaction; failure changes nothing).
5. **Verify.** Re-run the preflight: `enquiry_table` = `"Enquiry"`, counts unchanged.
6. **Vercel env.** Add `CRON_SECRET` (long random string) to Production and Preview. Redeploy so `RESEND_API_KEY` (already set) and `CRON_SECRET` take effect.
7. Tell Claude: it merges PR #16, runs production smoke tests, submits a test enquiry to an approved address and checks the cron sweep.

## Rollback
Code: promote the previous READY deployment (`dpl_5kLcHMTY8zXhJHatsPCiZvaDUyXL`). Database (only if no enquiries must be kept): `DROP TABLE "Enquiry"; DROP TYPE "EnquiryStatus"; DROP TYPE "EnquiryKind";`.
