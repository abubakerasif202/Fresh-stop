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

The additive SQL was previously applied to the separate integration database. Continuation verification now confirms that actual Production project `asjjjivkmugbcruzdhju` already satisfies it, including nullable price/unit and valid publication index. All six model checks pass. No Production migration was necessary or executed. See PRODUCTION_DATABASE_VERIFICATION.md.

## Rollback

Use Vercel Deployments to promote the previous verified Production deployment after checking it against the current database schema. At release, rollback candidate `dpl_FXRvyLgpuMeYwgRn4p3bNX4roHji` was Ready and retained the canonical aliases. Confirm its live health before promotion. The deployment made no Production schema changes, so no database rollback is required. Never drop catalogue columns or restore NOT NULL without a reviewed migration and data check. No destructive rollback command is automated.

## Continuation release controls

The baseline before this continuation is main `998d3b2`, deployment `dpl_H9xBTbcvnjT5EgbopMPeF3adEvcb`. Work is isolated on `fix/release-gaps-20261018`; the original dirty feature checkout must remain intact. The intended primary origin was confirmed from the Production NEXT_PUBLIC_SITE_URL and Vercel domain API as `https://fresh-stop.vercel.app`; www is a serving alias and apex preserves path/query via 308 to www. Domain configuration is unchanged. During the final gate, the existing deployment began returning Prisma P1000 authentication failures. The owner-supplied connection still passed a database-mode build, so Production DATABASE_URL and DATABASE_URL_UNPOOLED were refreshed privately for the verified same project; no secret value is stored in this repository. The latter is the supplied session-pooler URL, not a true direct host: obtain the direct endpoint privately before future migration tooling requires it. A rebuilt deployment is required for refreshed secrets to take effect.

The public credits file is removed; internal records, original image masters and private verification reports are excluded from deployment. Verify all 12 new `/products/ai/<slug>-illustration.webp` assets return images, product details contain generic AI/no-packaging disclosure, and `/products/CREDITS.md` plus `/docs/IMAGE_SOURCE_RECORDS.md` return 404. Run `node.exe scripts/qa-domains.mjs` after Production alias assignment. Keep real packshot requirements distinct from the now-resolved generic visual placeholders.

Application rollback: rebuild the prior source commit `998d3b2` through the existing Vercel workflow with the refreshed Production secrets, smoke-test its protected candidate, then assign aliases. Do not directly promote the old deployment while it retains the failed authentication environment. Reverting only this application change restores previous placeholder display/public credits behavior while retaining the credential repair. No database rollback is required: this continuation performs no schema or row changes. Rotate the database credential exposed in chat separately using approved secret management; never commit or print it.
