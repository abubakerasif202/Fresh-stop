# Test report — 18 October 2026

Historical evidence only. Current 20 October continuation validation, provider blockers and browser results are recorded in [RELEASE_HANDOFF.md](RELEASE_HANDOFF.md).

Checks were run against the current feature branch using Windows Node 22 for the installed Windows-native dependencies. Snapshot and database-backed builds are separate from the protected Production smoke gate.

| Check | Result |
|---|---|
| Unit suite | 70 tests passed, 0 failed, including privacy, pooler URL normalization and pagination cases. |
| Lint | `npm.cmd run lint` passed with zero warnings. |
| Type check | `npm.cmd run typecheck` passed. |
| Optimized reviewed-snapshot build | Passed; 25 static pages and 120 kB First Load JS for home/catalogue. |
| Database-backed optimized build | Passed with the separate integration database after its approved compatibility upgrade. |
| Dependency audit | `npm audit --omit=dev`: 0 vulnerabilities. Full audit: 5 high, 0 critical, all in the development-only braces 3.0.3 / micromatch / fast-glob / Next ESLint chain. No safe patch was available during this audit; full audit failure is retained. |
| Catalogue evidence | Production API: 171 published database products / 11 categories. Snapshot: 171 products / 11 categories, including 161 staged definitions. No catalogue import or publication occurred. |
| Image inventory | 12 honest branded placeholders remain; no missing local image references, duplicate candidate slugs or orphan product images. |
| Production HTTP regression | 5 assertions passed against `https://fresh-stop.vercel.app` for catalogue/detail metadata in `<head>` and actual missing-product 404 status with normal and empty User-Agent. |
| Responsive browser sweep | 72 route/width combinations across 8 widths (320–1920 px): no horizontal overflow. 19 stabilized Axe scans: zero violations. 191 internal links returned 200; 8 key interactions passed. Normal-motion menu, intro and enquiry journeys passed. |
| Pagination browser sweep | 171 product links across 8 pages, 24 cards maximum, 171 unique slugs, bounded pager, filter/search URL behavior, page clamping, metadata canonicals, zero overflow and zero Axe findings for 320/375/1440 px on first/middle/last pages. 60 assertions passed. |
| Local production-mode Lighthouse, mobile | Home: Performance 86, Accessibility 100, Best Practices 100, SEO 69; LCP 3.6 s, TBT 140 ms, CLS 0. Catalogue: 91/100/100/69; LCP 3.2 s, TBT 120 ms, CLS 0.001. Preview `noindex` accounts for the SEO score. |
| Existing live home Lighthouse, mobile | Performance 97, Accessibility 100, Best Practices 100, SEO 100; LCP 2.5 s, TBT 100 ms, CLS 0. |
| Production candidate smoke | Candidate built from `4cf680a` passed route checks: home, catalogue, page 2, product detail, API, sitemap and robots returned 200; sitemap had 190 URLs; missing product/site routes returned 404; retired checkout returned 410; unauthenticated admin returned 401. Six concurrent sitemap requests all returned 200. |
| Production alias and mobile smoke | The initial code deployment for merge commit `2a68867b4a3a1ac8f179b245487a180bc56a0659` was `dpl_5ShRbpnybhmKneJ3DmT4X6J6Wt9S`; it served the canonical and custom-domain aliases. The canonical returned 200, apex redirected 308 to `www`, and `robots.txt` allows public pages while excluding admin/API/retired order routes. At 390 px, the mobile menu opened and closed; no console errors were recorded. Subsequent main deployments contain documentation-only commits and the same application code. |
| Production database error reproduction | The prior candidate returned HTTP 500 for `/sitemap.xml` with Supavisor `EMAXCONNSESSION` at the session-mode pool limit of 15. After runtime normalization to Supabase transaction mode and sitemap query deduplication, six concurrent requests returned 200. Vercel deployment logs for the candidate contained no matching Prisma/session-limit errors. |

The pagination result reduces the large-snapshot catalogue's initial mobile TBT from the prior 750 ms lab run to 120 ms. Lighthouse runs vary with hosting/data/network conditions; this comparison is directional, not a controlled field measurement. No INP or real-device keyboard-obstruction result is claimed. Axe does not certify full WCAG or screen-reader conformance.

## Database change evidence

The owner approved `docs/production-schema-upgrade.sql`. It was applied to the available integration database after a private schema-only backup under ignored `.vercel/backups`. Product 11, Category 5, StoreBranch 2, BranchInventory 22, DeliveryZone 2 and Order 0 record digests/counts were unchanged. The checker reports zero schema findings after the additive upgrade; no catalogue data was imported. Production is a different Supabase project. Vercel marks its DB URLs as secrets and writes `[SENSITIVE]` placeholders on `env pull`; the configured Supabase MCP account denied access to the production project. Production page/API/sitemap reads pass and exercise publication columns, but no Production schema inspection or DDL was performed. Nullable `price`/`unit` and the index remain unverified.

## HTTP metadata regression

The reproduced bug returned HTTP 200 for an unknown product and streamed catalogue/detail descriptions outside `<head>`. A products-list-only route loading boundary, `notFound()` in missing-product metadata resolution and Next `htmlLimitedBots` configuration fixed the root causes. The real HTTP regression script is `scripts/qa-http.mjs`; red/green JSON evidence is in `artifacts/full-audit`.

All tests used safe local/reviewed data or read-only public GET requests. No payment, order, customer message or Production database mutation was submitted. QA artifacts and screenshots remain local and are excluded from deployment uploads.
