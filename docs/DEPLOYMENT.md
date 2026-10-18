# Deployment and rollback

Fresh Stop uses the existing Vercel project `fresh-stop`, linked to `abubakerasif202/Fresh-stop`. Preserve the canonical origin `https://fresh-stop.vercel.app`; `freshstop.com.au` redirects to `www.freshstop.com.au`. The code release is authorized by the 18 October 2026 project request. Catalogue imports and product publication are separate business actions and are not part of deployment.

## Release gates

1. Inspect the semantic diff and stage named paths only. Preserve unrelated worktree changes and local agent settings.
2. Run Windows-native unit tests, lint, typecheck, optimized build, dependency audits, image checks and browser checks. Record unresolved dev-tool findings without suppressing them.
3. Verify the target Production catalogue through read-only APIs. On 18 October it returned 171 published database products in 11 categories. The integration database is separate and must not be mistaken for Production.
4. Verify Production secrets through Vercel without printing values. Production uses its existing database, admin password and shared Redis configuration. Preview uses the reviewed snapshot on the release branch only. Never deploy the snapshot to Production.
5. Build an unaliased Production candidate and smoke-test it through Vercel's protected deployment request path. Promote only after route, metadata, catalogue, security and mobile checks pass.
6. Merge the reviewed GitHub PR through the existing workflow, then verify the resulting Production deployment and public aliases. A Ready status alone is not production proof.

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

## Rollback

Use Vercel Deployments to promote the last verified Production deployment after checking it against the current database schema. The pre-task deployment was `dpl_FXRvyLgpuMeYwgRn4p3bNX4roHji`; current rollback identity and verification are recorded in HANDOFF after release. A code rollback must retain schema compatibility. The additive nullable catalogue columns can remain; never drop them or restore NOT NULL without a reviewed migration and data check. No destructive rollback command is automated.
