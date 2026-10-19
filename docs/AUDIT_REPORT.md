# Fresh Stop audit — 18 October 2026

Current release status: the 20 October owner-presentation storefront launch is authorized and in progress; deployment completion has not yet been verified. See [RELEASE_HANDOFF.md](RELEASE_HANDOFF.md) for current commerce validation and release evidence. The 18 October production and schema records below remain historical evidence and do not verify the new commerce migrations or storefront deployment.

The original release evidence below is historical. The dated release-gap continuation section records the subsequent schema verification, owner approvals, generated illustrations and credential recovery; it supersedes earlier outstanding-state statements.

Fresh Stop is an enquiry catalogue. The audit preserves its supplied brand, published product catalogue, enquiry channels, protected management and historical schema. It does not claim that online purchasing is available.

| Severity | Finding | Resolution or evidence |
|---|---|---|
| High, development tooling | Five high findings in the development-only braces 3.0.3 / micromatch / fast-glob / Next ESLint chain | No safe patched release was available during the audit. Production-only dependency audit reports zero vulnerabilities. No framework downgrade or suppression was used. |
| Medium, customer data | Authenticated reviewed Preview could reach historical-order handlers | GET and PATCH now stop before body/database access in reviewed snapshot mode; responses use no-store. Three regression tests cover the boundary. |
| Medium, SEO | Unknown product URLs returned 200 and streamed descriptions could land outside `<head>` | List-only loading route group, metadata resolution and missing-product `notFound()` fixed the root cause. Five HTTP assertions pass, including empty User-Agent 404. |
| Medium, performance | The initial catalogue rendered all 171 products; mobile lab TBT measured 750 ms | Server pagination caps each page at 24 and keeps filter/search URLs shareable. Final Lighthouse and browser results are in TEST_REPORT. |
| High, availability | Production serverless requests shared Supavisor session connections; concurrent sitemap queries exceeded the 15-session cap and returned 500 | Runtime now uses Supabase transaction pooling with Prisma compatibility enabled. Sitemap derives categories from one catalogue fetch. The Production candidate returned 200 for six concurrent sitemap requests; the merged deployment is live. |
| Medium, database configuration | Available integration schema differed from Prisma expectations and Production was a separate database | Owner-approved bounded additive upgrade was applied to the integration database after a private schema backup; record digests remained unchanged. Production catalogue was checked separately through read-only API requests. |
| Low, operations | Test discovery depended on POSIX shell utilities | Replaced it with a portable Node runner and verified the suite on Windows-native Node. |
| Low, help and metadata | About/Contact/FAQ were absent, homepage canonical was missing and catalogue evidence was stale | Added factual pages and links, canonical metadata, populated category cards and regenerated the review-range evidence. |
| Content limitation | Twelve branded image subjects lack verified product photography; baseline photo rights are not independently verified | Honest placeholders remain. No invented stock, prices, discounts, claims, image provenance or policies were added. |

No critical runtime security issue was found in the scoped review. This audit is bounded to the routes, data and configurations examined; it is not a claim that no vulnerability exists.

## Architecture and coverage

The project uses Next.js 15.5.28, React 19.3.1, TypeScript, Tailwind 4, Prisma 5.22 and PostgreSQL. It has URL-backed catalogue search/category filters, product details, loading/error/not-found states, native enquiry controls, product administration and protected historical-order administration. Public product APIs use explicit public projections and the published flag. Retired checkout, lookup and slot endpoints return 410 without reading request bodies or database state.

There is no payment processor, customer order backend or website-side contact submission. Product management supports the existing product fields and local image choices; separate category/store settings and image-upload infrastructure are absent. No checked-in CI workflow was found. Existing GitHub and Vercel integrations are used for release checks.

## Catalogue and placeholder register

The public Production catalogue returned 171 published database products in 11 categories on 18 October: 149 illustrative AI image records, 12 branded placeholders and 10 baseline photo-path records. Sampled API responses omitted prices, stock and customer data. The separate available integration database contains 11 product rows, 5 categories and 2 stores. Neither database received catalogue imports during this task.

All referenced local product image files exist; candidate product slugs are unique and the audit found no orphan product images. Path matches do not establish licensing, product identity or current availability. The older contact sheet is a historical subset and is not complete visual certification. The 12 unresolved brands and photo provenance constraints are listed in HANDOFF.

## Business facts intentionally left open

Product stock, packaging and pricing require direct confirmation. Approved privacy, terms and refund policy text, delivery coverage/fees and pickup commitments were not supplied. No fake testimonials, rating data, discount claims, legal commitments or service locations were added.

See TEST_REPORT for current verification evidence and HANDOFF for production release status and remaining work.

## Production release status

PR #7 is merged at `2a68867b4a3a1ac8f179b245487a180bc56a0659`; its first Production code deployment was `dpl_5ShRbpnybhmKneJ3DmT4X6J6Wt9S`. Subsequent main deployments contain documentation-only changes and the same application code. The Production database's publication columns are exercised by successful catalogue/sitemap reads, but Vercel redacts its database secrets and the connected Supabase MCP account cannot access that project. The nullable price/unit columns and publication index remain unverified; see HANDOFF for the exact follow-up.

## Release-gap continuation — 18 October 2026

This is a scoped continuation, not a repeated full audit. Critical: none discovered in this change. High: five development-only transitive advisory records remain (braces/micromatch/fast-glob/Next ESLint chain). Registry latest braces is 3.0.3 and affected; npm suggests an incompatible Next ESLint downgrade, so no unsafe forced fix was applied. Runtime audit has zero vulnerabilities. Rotate the database password shared in chat; no credential is retained in committed files.

Resolved medium verification gap: the actual Production connection's public catalogue fingerprint exactly matches all 171 live entries. Its nullable price/unit fields, publication metadata/default and full valid/ready btree index are verified. All six Prisma models pass; no Production migration or data write was required. The checker was strengthened after reproducing false-positive acceptance of partial/invalid/non-btree indexes; six regression tests pass.

Content: the owner approved continued use of the existing 10 photos and removal of public source links. Credits are preserved in excluded internal documentation. The owner additionally requested 12 generic AI food illustrations with visible labels. These replace shared placeholders only for known slugs, without inventing branded packaging or overwriting owner image edits. Actual packshots remain unverified; this is not a packaging-authenticity claim. Image approvals/limits and exact policy/service input requirements have dedicated registers.

SEO: Production NEXT_PUBLIC_SITE_URL and verified Vercel domains confirm the existing canonical origin. All three domain sitemaps contain the same 190 canonical URLs; apex redirects to www preserving paths/queries. No domain change is justified. Read-only QA checks also assert removal of public credits/internal records and preserve retired checkout/admin authorization behavior. Mobile and postdeployment outcomes are recorded in TEST_REPORT when verified. Enquiry-only behavior, prices, stock, orders and unrelated dirty files are preserved.

Final gate incident: the old Production deployment returned P1000 authentication errors for fresh catalogue/detail/sitemap requests. The supplied authorized connection continued to pass the actual database-backed build. Production DATABASE_URL/DATABASE_URL_UNPOOLED were therefore refreshed privately for the same verified project; a fresh deployment is required before claiming recovery. Secret values were neither committed nor printed. No database data/schema changes occurred.

Recovery verified: PR #10 / merge1997eab deployed as `dpl_Bmnh7jdDLvPrvqCrMdfoWemP7pJG`. All45 Production smoke checks passed; fresh API/catalogue and 12 illustrated details/assets are healthy. Live totals171products/11categories/161AI/10photos/0displayedplaceholders. The scoped error query returned zero errors. Retained photo bytes match, and the 390px Production page has zero Axe findings/no console errors. No new Lighthouse measurement is asserted.
