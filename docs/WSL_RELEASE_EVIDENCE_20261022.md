# WSL release evidence — 22 October 2026

**BLOCKED. No merge, production migration, production deployment or payment activation.** Website release approval is already held. Technical gates remain open. This report supersedes older local-test, backup and access claims; machine-readable results are in [the evidence record](evidence/WSL_RELEASE_20261022.json).

## Checkout and tools

Original worktree: `/mnt/c/Users/abuba/.worktrees/fresh-stop-stripe-live`, branch `feat/stripe-live-readiness-20261021`, starting SHA `07fe949492b95bdc2caf749a50c15c83600fc105`. Its Windows `.git` pointer cannot be resolved directly by Linux Git. Explicit Linux `GIT_DIR` and `GIT_WORK_TREE` verified its root, origin, branch and status. Almost all reported modifications were line endings; the substantive existing edit was the delivery-save assertion in `scripts/qa-ui-cart.mjs`.

Native isolated checkout: `/home/abuba/projects/fresh-stop-stripe-live-wsl-20261022`, same origin and branch. Tracked working files, including the existing edit, were preserved; Windows dependencies and uncommitted source files were not changed. Only the native copy's line endings were normalized. Linux dependencies came from `npm ci` with the existing lockfile. Prisma generated `libquery_engine-debian-openssl-3.0.x.so.node`.

Validation used Linux Node 22.23.2, npm 10.9.8, `/usr/bin/git`, Linux Codex/npx, and an isolated Linux Vercel CLI 59.11.2 installation matching the existing Windows CLI version. Linux PowerShell was installed only under the task's tools directory. The helper test now chooses `pwsh` on Linux and `pwsh.exe` on Windows. No application dependencies were upgraded.

## Executed checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, zero warnings |
| `npm test` | PASS: 396 passed, 0 failed/skipped, 14 suites |
| `npm run build` | PASS: fresh Linux production build |
| Linux PowerShell helper tests | PASS: 23 passed, 0 failed; provider/Vercel calls mocked |
| `git diff --check` | PASS |
| `npm audit --omit=dev` | BLOCKED: both npm advisory POST endpoints timed out; no current vulnerability count established |
| Extended local browser suite | PASS: 114 passed, 0 failed |
| Supplemental local browser sweep | PASS: 66 passed, 0 failed |
| Authenticated Preview browser sweep | FAIL: 47 passed, 19 failed |
| Public production browser sweep | FAIL: 57 passed, 9 failed |

Database tests used a new disposable PostgreSQL **17.11** container bound only to loopback at port 54329, database `fresh_stop_dev`. Historical migrations ran only on that empty disposable database. Browser fixtures were explicitly labelled TEST. Production-mode rate limiting used disposable Redis 7 through a local HTTPS REST adapter. Stripe checkout responses in the extended suite were mocked: no provider payment or real charge occurred.

Both sweeps used widths 320, 375, 430, 768, 1024, 1440 and 1920. Supplemental coverage included home, catalogue, stores, contact, cart and checkout, plus 12 Axe scans at 320/1440. Local scans had no violations, overflow or runtime errors. The extended suite exercised cart persistence, quantities, stale items, customer tracking, authentication and management of TEST records. Its authenticated admin matrix covered seven routes at 320/1440. Mobile and desktop screenshots were inspected.

Failed attempts remain in ignored `artifacts/stripe-live/`: the first extended run passed 67/68 before a missing local production rate-limiter service prevented cart refresh. Earlier supplemental attempts reported a cart hydration mismatch while injecting an Axe script element. Evaluating Axe without adding a script element resolved that scanner artifact; the final 66-check run passed. Plain navigation and a separate 42-navigation diagnostic also produced zero hydration errors. No failed attempt is represented as a passing run.

## Preview database investigation

Linux CLI authentication refreshed the expired Vercel session; initial API 403 responses are resolved. Preview database secrets are present as `sensitive` entries. They were not exported or bypassed. No branch-specific database override or authorised isolated target has been verified.

Authenticated deployment: `dpl_4ohwcuHHbcL4Yq2PGX7tkx8ZNefD`, SHA `07fe949492b95bdc2caf749a50c15c83600fc105`, **READY**:

`https://fresh-stop-rjodcp2rt-abubakerasif202s-projects.vercel.app`

Supported `vercel curl` authentication and its deployment cookie were used for the deployed browser run. Homepage and stores return **500** at every tested width. Catalogue APIs return **503**; the catalogue page displays its error boundary and lacks its expected title/canonical. Contact, telephone, WhatsApp, footer logo link, disabled checkout and the unauthenticated admin guard pass. Positive remote admin authentication remains unverified because its protected credential was not exported.

Runtime logs show `PrismaClientInitializationError` / `P1001` and inability to reach `aws-0-ap-southeast-2.pooler.supabase.com:6543`. DNS resolves the pooler to IPv4. WSL TCP and authenticated read-only SQL succeed on both **5432 and 6543** using the authorised production connection. The direct production endpoint resolves only to IPv6 and WSL reports network unreachable there. Independent HTTPS requests reach Vercel and Supabase management endpoints. This rules out a general WSL pooler outage; it does not verify Vercel's protected target, password, network policy or project isolation.

The existing runtime URL normalizer already selects transaction port 6543 and `pgbouncer=true` for the shared pooler, consistent with [Supabase's serverless connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres). The public integration URL references `idzicziwqkeqqverxrpq`, while the verified production project is `asjjjivkmugbcruzdhju`. That integration value does not establish what the protected DATABASE_URL overrides contain. Connected Supabase management access cannot inspect the Fresh Stop project. **Root cause remains narrowed to deployed database configuration/connectivity; no configuration resolution is claimed.** Production credentials were not reused for Preview.

## Production backup and migration

Fresh read-only tax preflight and Prisma scalar comparison passed: 172 products, no scalar type mismatches, exactly the two missing tax approval columns, no Prisma migration history, three historical Supabase migrations, and database checkout approval false.

A current custom-format logical backup was captured privately, including ownership and ACL metadata. It is outside the checkout at `/home/abuba/.local/share/fresh-stop-backups/20261022-wsl/production-full.dump`, in a directory with mode 0700 and a file with mode 0600. Its SHA-256 is recorded in the evidence JSON. No database contents or credentials are committed.

Recovery was tested in a new network-isolated Supabase PostgreSQL container, in an independent database. `pg_restore --exit-on-error` completed successfully with ownership and ACL restoration enabled. All **14 application table row counts and ordered content checksums match production**, including 172 products and 22 inventory rows; table RLS flags and grants also match. Source is PostgreSQL 17.11; the Supabase-compatible restore image is 17.6. The vanilla PostgreSQL restore initially failed for missing `supabase_vault`; restoring with the restricted postgres role then failed on a privileged function. The successful procedure used the Supabase image, its local superuser and missing ownership-role placeholders. These were changes only in the disposable recovery target. Logical backup does not include Supabase platform settings or role passwords.

Recovery procedure: retain the private dump and checksum; create a fresh network-isolated Supabase PostgreSQL 17 target with required extensions; recreate missing referenced ownership roles; restore as the target's local administrative role with `pg_restore --exit-on-error`; compare counts, checksums, constraints, RLS and grants before any recovery cutover. Do not restore over production or reuse this target for destructive tests. The existing production rollback remains application rollback with checkout closed and additive columns retained.

The four exact repository tax migrations, unchanged and in order, were additionally rehearsed on a **separate PostgreSQL 17.11 synthetic bridge** with 172 synthetic products. The transaction preserved every existing product checksum and RLS, left all products unapproved, rejected invalid actor/timestamp metadata and produced a validated final constraint. No migration or destructive test ran on restored production data. **Production migration was not applied**, because isolated Preview runtime readiness still fails. Never replay historical `0_init` or run reset against production.

## Existing production and remaining gates

Authenticated www alias lookup identifies existing production deployment `dpl_BZinEsSnineZCrSbRyxwf8PvuJur`, SHA `7b60bff30aca784d7a89c5db762f58f779971e9d`, READY. This deployment predates this continuation; no new production deployment was performed.

The live browser found catalogue API 503s, four wrong/missing canonical checks, two missing-title accessibility failures on the catalogue error page and no matching linked AB Web Studio footer logo. Homepage/stores can return stale cached 200s while real database reads fail. Production logs contain the same pooler connection failure. Public telephone and WhatsApp links use only `+61 423 936 586`; unauthenticated admin is 401 and `/api/checkout/status` is 200 with `enabled:false`.

Remaining prerequisites: identify and authorise the isolated Preview database and privately configure its scoped secrets, restore suitable Supabase management access, pass deployed runtime and authenticated admin checks, obtain a successful current dependency audit, then perform the reviewed additive production migration/postchecks before merge/deployment. No additional generic website approval is needed. Stripe account identity, rotated credentials, signed webhook/provider testing, real sandbox payment testing and owner commercial approvals remain separate; live payments stay disabled.

## Validation commands

Run from the verified native checkout with the disposable database and local Redis adapter running:

```bash
cd /home/abuba/projects/fresh-stop-stripe-live-wsl-20261022
export PATH=/home/abuba/tools/fresh-stop-vercel-20261022/node_modules/.bin:/home/abuba/.nvm/versions/node/v22.23.2/bin:$PATH
export DATABASE_URL=postgresql://fs_dev:fs_dev@localhost:54329/fresh_stop_dev
export DATABASE_URL_UNPOOLED="$DATABASE_URL"
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
git diff --check
/home/abuba/tools/fresh-stop-pwsh-20261022/pwsh -NoProfile -File scripts/configure-stripe-live.test.ps1
QA_TOOL_ROOT=/home/abuba/tools/fresh-stop-qa-20261022 BASE_URL=http://localhost:3210 QA_ADMIN_USER=admin QA_ADMIN_PASSWORD=local-wsl-qa-only node scripts/qa-ui-cart.mjs
```
