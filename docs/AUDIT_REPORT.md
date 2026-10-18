# Project audit — 18 October 2026

This is an implementation audit of the current enquiry conversion. It is not an assertion that checkout or payment works. Earlier shopping audit behavior is superseded by intentionally retired purchasing routes.

| Severity | Finding | Action/status |
|---|---|---|
| Critical release blocker | Available available integration PostgreSQL schema lacks Product.isPublished/imageAlt and publication index; price/unit non-null differs from application | Read-only reproduced P2022. Prepared bounded transactional compatibility SQL and metadata checker. Applied after explicit owner approval and a private schema backup; post-upgrade checker has zero findings. |
| High, development tooling | npm audit reports 5 high chain findings through braces 3.0.3 / micromatch / fast-glob / Next ESLint | Production-only audit has 0 vulnerabilities. Latest braces remains 3.0.3. No unsafe Next downgrade or suppression. |
| Medium, privacy boundary | Authenticated Preview orders API could read live historical customer records | Fixed: reviewed-snapshot GET/PATCH blocked before body/DB; no-store responses; regression tests. |
| Medium, operations | Test command used POSIX find/substitution and Windows modules were invoked from WSL | Node-based cross-platform test discovery; native Windows suite passes. |
| Medium, catalogue evidence | 83/93 counts and incomplete downloadable guide no longer match expanded source | Added offline evidence generator; regenerated 161 proposals / 171 snapshot / 11 categories and truthful review-range guide. |
| Medium, release configuration | Local DB aliases do not fill DATABASE_URL; production secrets pulled as [SENSITIVE] | Documented exact variables; private alias can support explicit read-only audit only. No secret replacement/fallback fabricated. |
| Low, SEO | Homepage canonical absent | Added canonical `/`; new factual information routes have unique metadata and sitemap entries. |
| Low, UX/help | No dedicated About/Contact/FAQ | Added factual pages, direct contact actions and native FAQ disclosures; footer links. |
| Content/provenance blocker | 12 branded placeholders, 78 planning additions not confirmed stock, baseline photography provenance not independently verified | Preserve honest placeholders and review-only proposals; no fabricated packshots, prices or availability. |

## Architecture and route audit

Next.js 15.5.28, React 19.3.1, Tailwind 4, Prisma 5.22; URL-backed catalogue filters, individual details, public field projections, native enquiry dialog, existing brand and reduced-motion styles. Five existing core public routes plus product details/category/search, three new help routes, loading/error/404 states and protected admin remain. Public APIs bound search/limit and return 503 when catalogue is unavailable. Retired endpoints return 410. No active cart, payment, contact submission backend or customer account exists.

Admin product management supports products, image selection and historical order status. Dedicated category/store-settings/upload tools are absent; adding unnecessary infrastructure was avoided. There is no CI workflow checked in; local scripts and release gates are documented.

## Placeholder register

- Missing image: 12 branded entries retain explicit placeholder; see HANDOFF for names.
- Missing product data: price/unit/stock unknown on staged records by design, never fabricated.
- Missing business information: delivery fees/coverage/timing, pickup details, approved privacy/terms/refund policies require owner facts. No invented policies published.
- Incomplete functionality: purchasing intentionally retired; enquiry channels work by launching external apps. No success simulation.
- Development-only: 161 staged proposals available only in explicit local/Preview snapshot. Production refuses that mode.

All referenced local product files exist; zero duplicate candidate slugs. File presence/filename matching does not establish photography rights, species accuracy or actual stock. Restricted shop photos remain excluded from public/Git/deploy.

Fresh execution results and performance limitations are in TEST_REPORT; deployment identity and unresolved gates are in HANDOFF.

## Production baseline qualification

The non-exportable Production DATABASE_URL was not proven identical to the available POSTGRES_PRISMA_URL integration. Read-only external smoke checks on 18 October returned 200 for existing home/catalogue/search/stores/wholesale/delivery, API products (100-result limit) and a 187-URL sitemap; admin returned 401/no-store and checkout API 410. New /about, /contact and /faq remain 404 on the pre-task deployment. Therefore the integration schema incompatibility is a release-validation blocker, not evidence that the currently deployed public site is down. Production data-source identity/configuration still needs verification.

## Approved schema upgrade evidence

Owner approval received during this task. A private schema-only pg_dump was saved to ignored `.vercel/backups/20261018-before-catalogue-schema.sql`; the bounded transactional compatibility SQL succeeded. All pre-existing record digests remain identical: Product11, Category5, StoreBranch2, BranchInventory22, DeliveryZone2, Order0. Publication/image-alt columns and index now exist, price/unit permit nulls; schema checker reports compatible:true / zero findings. No catalogue candidates were imported or published. Evidence: artifacts/full-audit/schema-upgrade-result.json and database-schema-after.json. This verifies the selected integration; hosting Production connection identity remains a separate release check.
