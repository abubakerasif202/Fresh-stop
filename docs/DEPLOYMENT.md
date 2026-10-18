# Deployment and rollback

Fresh Stop uses the existing Vercel project `fresh-stop`, linked to `abubakerasif202/Fresh-stop`. Preserve the canonical origin `https://fresh-stop.vercel.app`; `freshstop.com.au` redirects to `www.freshstop.com.au`. The code release is authorized by the 18 October 2026 project request. Catalogue imports and product publication are separate business actions and are not part of deployment.

## Release gates

1. Inspect the semantic diff and stage named paths only. Preserve unrelated worktree changes and local agent settings.
2. Run Windows-native unit tests, lint, typecheck, optimized build, dependency audits, image checks and browser checks. Record unresolved dev-tool findings without suppressing them.
3. Verify the target Production catalogue through read-only APIs. On 18 October it returned 171 published database products in 11 categories. The integration database is separate and must not be mistaken for Production.
4. Verify Production secrets through Vercel without printing values. Production uses its existing database, admin password and shared Redis configuration. Preview uses the reviewed snapshot on the release branch only. Never deploy the snapshot to Production.
   `CATALOGUE_DATA_SOURCE=reviewed-snapshot` is branch-scoped in Vercel; add the non-secret Preview override for each branch that should build from the reviewed snapshot. Without it, Preview falls back to the configured database and can fail when that database is unavailable.
5. Build an unaliased Production candidate from a clean commit worktree and smoke-test it through Vercel's protected deployment request path. The 18 October 2026 candidate passed catalogue, pagination, sitemap, 404, retired checkout and admin-auth checks, including six concurrent sitemap requests.
6. Merge the reviewed GitHub PR through the existing workflow, then verify the resulting Production deployment and public aliases. A Ready status alone is not production proof. PR #7 merged at `2a68867b4a3a1ac8f179b245487a180bc56a0659`; deployment `dpl_5ShRbpnybhmKneJ3DmT4X6J6Wt9S` is Ready at `https://fresh-stop.vercel.app`.

## Commands

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd audit --omit=dev
npm.cmd run build
git push origin HEAD
gh pr checks 7 --watch
```

Use `vercel.cmd deploy --prod --skip-domain --yes` for a protected, unaliased candidate. Use `vercel.cmd curl` with `--deployment <candidate-url>` to exercise Vercel's protected URL without changing its protection settings. Do not submit real orders, payments or external enquiries during QA.

The runtime converts Supabase shared-pooler `DATABASE_URL` values on port 5432 to transaction mode on 6543 and forces Prisma 5's `pgbouncer=true` compatibility flag. Other database hosts and `DATABASE_URL_UNPOOLED` are preserved. Keep migration commands on the direct unpooled URL. Production database secrets are redacted by Vercel and must not be copied into logs or reports.

The additive SQL was applied to the available integration database only. Production reads for sitemap/catalogue work, but the owner needs to verify the nullable price/unit columns and publication index on the separate Production database. The current Vercel/Supabase credentials cannot access it for schema inspection or migration. Do not claim that the Production schema upgrade has been applied.

## Rollback

Use Vercel Deployments to promote the previous verified Production deployment after checking it against the current database schema. At release, rollback candidate `dpl_FXRvyLgpuMeYwgRn4p3bNX4roHji` was Ready and retained the canonical aliases. Confirm its live health before promotion. The deployment made no Production schema changes, so no database rollback is required. Never drop catalogue columns or restore NOT NULL without a reviewed migration and data check. No destructive rollback command is automated.
