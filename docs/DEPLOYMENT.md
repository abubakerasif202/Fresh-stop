# Deployment and rollback

Existing platform: Vercel project `fresh-stop` linked by ignored `.vercel/project.json`, backed by GitHub `abubakerasif202/Fresh-stop`. Preserve this infrastructure. The 18 October user request authorizes code commit/push/deployment after safety gates. Proposed catalogue imports remain separately approval-gated.

## Release gates

1. Review scoped semantic diff and untracked files. Preserve unrelated dirty CRLF changes and local agent configuration. Do not `git add .`.
2. Run tests/typecheck/lint, production-only and full dependency audits, image checks and browser QA. Record exact failures; audit is not bypassed.
3. Check database schema read-only. The 18 October audit found missing Product.imageAlt/isPublished/index plus required price/unit columns. `production-schema-upgrade.sql` is a reviewable additive migration, not automatically executed. Apply only with explicit approval of that database change. Back up schema and confirm a restorable platform backup first.
4. Verify production DATABASE_URL, DATABASE_URL_UNPOOLED, ADMIN_PASSWORD and shared Redis credentials within Vercel. Secret values must remain private; pulled `[SENSITIVE]` placeholders cannot be used locally. Use `CATALOGUE_DATA_SOURCE=database` (or unset), never reviewed-snapshot in Production. Set NEXT_PUBLIC_SITE_URL to the confirmed canonical production origin.
5. Run a successful database-mode production build, independent code/security review and read-only production smoke checks before announcing release completion.

## Commands

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd audit --omit=dev
npm.cmd run build
# After gates and selective commit, push the feature branch:
git push origin HEAD
# Existing linked project, explicitly selected Production only after gates pass:
vercel.cmd --prod
```

A feature push may create a Preview whose data environment differs from Production. Preview requires either its own compatible read-only DB or explicit reviewed-snapshot build environment. Deployments must exclude original restricted photos, assets, artifacts, environment files and local tooling directories. Review `.vercelignore` before upload.

After deployment, inspect its Ready state and exact commit/deployment ID. Check home, catalogue, real product, search/category, images, stores, About/Contact/FAQ, branded 404, enquiry dialog, mobile menu, canonical/OG/sitemap/robots, protected admin and retired APIs. Do not submit real customer orders or send external enquiry messages during smoke testing.

## Rollback

Use the Vercel project Deployments screen to promote the previously verified production deployment after checking its compatibility with the current DB. The pre-task production deployment is `dpl_FXRvyLgpuMeYwgRn4p3bNX4roHji` (16 October), with alias fresh-stop.vercel.app; Ready status alone does not prove its routes work. A code rollback must preserve schema compatibility. Additive catalogue columns can normally remain; do not drop columns or reimpose NOT NULL after nullable drafts exist. Use a reviewed data migration for any schema rollback. No destructive rollback is automated here.
