# Test report — 18 October 2026

Evidence is captured during this task. Historical reports are not treated as current passes.

| Check | Actual result |
|---|---|
| Windows native unit suite | 61 tests passed, 0 failed (includes three new orders privacy/cache tests). |
| Orders regression cycle | Three new tests first reproduced DB access/cache failures, then passed; focused admin set 9/9 passed. |
| WSL unit invocation | Failed before tests because installed esbuild targets Windows. Resolved execution through PowerShell native Node; no dependency workaround. |
| Full lint | Passed `npm.cmd run lint` with max-warnings=0. |
| Type checking | Passed `npm.cmd run typecheck` after optimized build regenerated route types. |
| Full dependency audit | 5 high, 0 critical, all dev-only braces dependency chain. Command exits nonzero; not suppressed. |
| Production dependency audit | 0 vulnerabilities (`npm audit --omit=dev`). |
| Offline source/image inventory | 171 snapshot products, 11 active categories, 161 proposals; 12 placeholders; zero missing product images, duplicate slugs, or orphan images. |
| Available integration database read-only audit | 11 products, 5 categories, 2 stores. 5 baseline schema discrepancies across 6 Prisma models; 0 after approved upgrade. No customer data queried by schema checker. |
| Database-mode storefront | Blocked by missing columns/configuration; no clean production-ready claim. |
| Browser responsive baseline | Initial dev capture: 48 route/width combinations had no horizontal overflow. Raw transient animation/image issues preserved; stable production rerun pending. |
| Optimized build | Passed in reviewed-snapshot / Vercel Preview mode: 25 static pages, home/catalogue First Load JS 120 kB. Database-mode release build remains unverified. |
| Lighthouse/Core Web Vitals | Pending measurement; no 90+ scores or field INP claimed. |
| Production deploy/smoke | Pending release gates; previous Vercel deployment Ready status does not prove current site health. |

Commands are documented in SETUP and the implementation plan. QA browser traffic uses local routes; no actual customer order, payment or external message is sent. Full audit artifacts remain under artifacts/full-audit and are excluded from deployment. Automated axe results do not certify full WCAG/screen-reader compliance. Real-device keyboard obstruction and field INP require further evidence.

## Production baseline qualification

The non-exportable Production DATABASE_URL was not proven identical to the available POSTGRES_PRISMA_URL integration. Read-only external smoke checks on 18 October returned 200 for existing home/catalogue/search/stores/wholesale/delivery, API products (100-result limit) and a 187-URL sitemap; admin returned 401/no-store and checkout API 410. New /about, /contact and /faq remain 404 on the pre-task deployment. Therefore the integration schema incompatibility is a release-validation blocker, not evidence that the currently deployed public site is down. Production data-source identity/configuration still needs verification.

## Approved schema upgrade evidence

Owner approval received during this task. A private schema-only pg_dump was saved to ignored `.vercel/backups/20261018-before-catalogue-schema.sql`; the bounded transactional compatibility SQL succeeded. All pre-existing record digests remain identical: Product11, Category5, StoreBranch2, BranchInventory22, DeliveryZone2, Order0. Publication/image-alt columns and index now exist, price/unit permit nulls; schema checker reports compatible:true / zero findings. No catalogue candidates were imported or published. Evidence: artifacts/full-audit/schema-upgrade-result.json and database-schema-after.json. This verifies the selected integration; hosting Production connection identity remains a separate release check.
