# Fresh Stop completion implementation plan

> Execute the user-authorized Plan → Build → Verify → Optimize workflow continuously. Use independent audits and a fresh code review before release.

**Goal:** Complete the existing enquiry catalogue, validate its real behavior, and release through the linked GitHub/Vercel project when gates pass.

**Architecture:** Preserve Next.js App Router, Prisma PostgreSQL, public catalogue projections, generated illustrative imagery and authenticated historical administration. Production reads published database products; reviewed-snapshot is a local/Preview-only proposal view. Purchasing was explicitly retired in the existing implementation and remains retired.

**Stack:** Next.js 15.5.28, React 19.3.1, Tailwind 4, Prisma 5.22, Node 22 on Windows.

**Spec:** User full-project audit/completion/deployment request, 18 October 2026.

## Constraints and decisions
- Preserve all preexisting dirty work. Initial tracked differences are line-ending-only (`git diff --ignore-space-at-eol --stat` empty); do not normalize unrelated files.
- Preserve enquiry conversion and brand; no fictitious stock, prices, policies, store facts or payment success.
- No live DB mutations, test transactions, destructive migrations, force push or unrelated local configuration in release.
- User explicitly authorizes commit/push/deployment after verified checks. Prior preview-only documentation describes an earlier approval boundary, superseded by this request for code deployment; catalogue imports still need specific stock/content approval.
- Run Windows native Node tooling because installed native modules target Windows. Fix the shell-specific test runner.

## Review focus
- Preview must never expose historical orders or write production data.
- Search/category metadata must canonicalize correctly and avoid indexing search URLs.
- Catalogue additions remain proposals until staff approval; production image provenance stays truthful.
- Mobile menus and enquiry dialogs must work with keyboard and reduced motion.
- Production must use a reachable database and production metadata, never snapshot fallback.

## Checklist
- [x] Inspect branch/status, framework, routes, catalogue modes, assets, deployment association and historical evidence.
- [ ] Run baseline tests, typecheck, lint, dependency audit, browser checks and performance measurements; record environment failures separately.
- [x] Fix portable test command (`scripts/run-tests.mjs`, package.json); validate full suite on Windows.
- [x] Regression-test and block snapshot order reads (`src/app/api/admin/orders/route.ts` and new route test); retain no-store responses.
- [ ] Verify live catalogue read-only and local snapshot totals, placeholders, image references and SEO; correct only reproduced defects.
- [ ] Fix important reproduced UI/accessibility issues; verify all eight requested widths and key enquiry flows.
- [x] Add useful About/Contact/FAQ pages from existing facts only if route audit confirms missing; no invented policy pages.
- [x] Complete README, .env.example and architecture/setup/deployment/operations/handoff/audit/test reports with actual evidence and remaining blockers.
- [ ] Run production build in database mode with existing protected environment; never log credentials.
- [ ] Independent code/security review, relevant regression reruns and scoped diff/secret review.
- [ ] Selectively commit only this task files, push existing feature workflow, deploy verified code to existing Vercel project if gates pass.
- [ ] Inspect Ready state, production HTTP/metadata/images/mobile/enquiry/retired checkout behavior, document commit/deployment identity and rollback.

## Verification commands
```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd audit
npm.cmd audit --omit=dev
$env:CATALOGUE_DATA_SOURCE = "reviewed-snapshot"
npm.cmd run build
```
Production-mode build and deployment additionally use private Vercel environment files. Browser QA runs only read-only GETs externally; retired-endpoint POST assertions stay localhost-only.

## Execution evidence
Initial WSL tests failed before test execution because esbuild is installed for Windows. This is an environment mismatch, not thirteen product regressions. npm audit: 5 high findings in the dev-only braces chain, 0 production vulnerabilities; braces latest is still 3.0.3 so no patched release is available at audit time. No unsafe framework downgrade will be applied.

## Verification ledger

- Windows native tests: 61/61 pass; new privacy/cache tests observed RED then GREEN; typecheck and full lint pass.
- Snapshot optimized build passes, 25 static pages, home/catalogue first-load JS 120 kB. Build is Preview/local evidence, not a database-mode production release gate.
- Independent code and SQL review: zero actionable findings. TypeScript specialist review follows.
- Available integration DB read-only: 5 Product metadata discrepancies; transactional SQL prepared, unapplied. Owner question pending. Non-exportable Production DATABASE_URL identity is not verified; existing external public routes respond normally.
- Scope ruling: retain enquiry-only architecture and staged/unapproved proposals; never revive payment or silently import stock.
- Scope ruling: use existing public canonical origin from hosting (https://fresh-stop.vercel.app) for release metadata; custom apex redirects to www, whose current metadata also canonicalizes to the Vercel origin. Do not change live hosting configuration during a blocked database release.
- Preserve unrelated CRLF-only worktree differences. Release only task semantic changes, never local agent configuration or restricted photos.

- Owner explicitly approved the reviewed schema upgrade. Private pg_dump schema backup captured; transactional SQL applied successfully. Before/after row digests unchanged: Product11, Category5, StoreBranch2, BranchInventory22, DeliveryZone2, Order0. No candidates imported. Schema checker now compatible with zero findings across6 models.
- Homepage category cards now include only categories represented in published catalogue data; avoids empty range links when production has fewer products than Preview. Database-mode browser checks will verify.
