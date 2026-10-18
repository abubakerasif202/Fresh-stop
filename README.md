# Fresh Stop — product catalogue & enquiries

Fresh produce, groceries, wholesale and home delivery enquiries for Rockdale and Riverwood. Built with Next.js 15, React 19, TypeScript, Tailwind v4 and Prisma/Supabase PostgreSQL.

## Public website
- Catalogue with URL-backed search and categories, individual product pages and illustrative AI photography.
- Wholesale call/email actions: +61 423 936 586 · info@freshstop.com.au.
- Home delivery enquiries through email and WhatsApp. No fees, timing or delivery areas are promised.
- Verified existing store details and map links.
- No customer cart, checkout, payment, purchase quantity, wishlist, account or tracking UI.
- Retired purchase APIs return HTTP 410 before reading input or accessing the database.
- Protected admin product management and historical orders remain; schema/history are preserved.

## Development
```powershell
npm ci
$env:CATALOGUE_DATA_SOURCE = "reviewed-snapshot"
npm run dev
```

The explicit reviewed snapshot uses public catalogue/store fields audited read-only on 16 October 2026 plus proposed additions. It is for local and Vercel Preview review, never Production. No database credentials are needed to browse this mode; admin writes and historical order reads are disabled. Review candidates are not automatically published to the live database.

Database mode is the default: configure DATABASE_URL and DATABASE_URL_UNPOOLED on the server. Keep ADMIN_PASSWORD and Redis credentials server-only. Never seed or reset a live database. Protected admin continues to use existing fail-closed authentication and rate limiting.

## Catalogue approval
Source: src/data/catalogue-candidates.ts. Public-only baseline: src/data/catalogue-baseline.json. Product image provenance and review: docs/asset-catalogue-evidence.md.

```powershell
npx tsx scripts/import-enquiry-catalogue.ts
# Read-only database comparison, with server database credentials:
npx tsx scripts/import-enquiry-catalogue.ts --audit
```

The importer defaults to an offline plan. Applying requires explicit owner approval and the documented APPROVED_CATALOGUE_IMPORT guard. It inserts unpublished drafts, never resets tables, never changes existing products, inventory or customer orders. Staff review/publication is a separate action.

The original 19 shop photographs are authorised for INTERNAL REVIEW ONLY. Source ZIP extraction, derivatives and contact sheets containing shop photographs are ignored by Git and excluded from deployment. Do not place them in public or commit them. Supplied website screenshots and brochure graphics are references; their invented prices/claims/rendered labels are not published. A clean text range guide is available at /catalogues/fresh-stop-range.txt.

## Validation
```powershell
npm run typecheck
npm run lint
npm test
$env:CATALOGUE_DATA_SOURCE = "reviewed-snapshot"
npm run build
```

Use scripts/qa-catalogue.mjs against localhost for browser QA; docs/catalogue-qa-evidence.md documents the command. No live customer forms or database mutations are part of QA.

## Audit and handoff (18 October 2026)

Verified current Production catalogue: **171 published database products / 11 categories**, including **161 illustrative AI images (12 newly requested generic food illustrations) / 10 owner-approved photo-path files / 0 displayed placeholders**. Current reviewed snapshot has the same171-item range assembled from a baseline and161 staged definitions; deployment does not import or publish these definitions.

The separately available integration database contains 11 products / 5 categories / 2 stores. Its five schema discrepancies were fixed by the owner-approved additive upgrade after a private schema backup; record digests stayed unchanged and no catalogue items were imported. Production is separate and now independently verified through authorized owner access: nullable price/unit, publication metadata/indexes and all six models pass. No Production DDL was needed. See [database verification](docs/PRODUCTION_DATABASE_VERIFICATION.md).

```powershell
npx tsx scripts/check-database-schema.ts
npx tsx scripts/generate-catalogue-evidence.ts
npx tsx scripts/catalogue-image-audit.ts
```

The first command audits metadata read-only and exits 1 when incompatible. The latter two regenerate offline review evidence without querying a database. The test runner now works across Windows/POSIX shells; run native Node for your installed dependency platform.

Handoff: [Architecture](docs/ARCHITECTURE.md), [Setup](docs/SETUP.md), [Deployment and rollback](docs/DEPLOYMENT.md), [Operations](docs/OPERATIONS.md), [Handoff](docs/HANDOFF.md), [Audit](docs/AUDIT_REPORT.md), [Test results](docs/TEST_REPORT.md).

## Release

Use the linked GitHub/Vercel project. PR #10 merged as `1997eab14e048923e4461350b5b69dbbb09ee5d5`; its verified Production code deployment was `dpl_Bmnh7jdDLvPrvqCrMdfoWemP7pJG`, serving the canonical Vercel origin and existing custom domains. All 45 smoke checks passed after privately refreshing stale Production database credentials. The schema already satisfies the approved additive SQL; no Production DDL ran. Enquiry-only behavior remains. Future rollback must rebuild prior source with current secrets, not directly promote the stale-auth deployment. See HANDOFF and DEPLOYMENT for exact evidence and remaining owner inputs. Subsequent documentation-only commits may have newer deployment IDs with the same application code.

## Release-gap maintenance (18 October 2026)

Production schema is independently verified; see [database verification](docs/PRODUCTION_DATABASE_VERIFICATION.md). The owner-approved generic illustrations replace only 12 known placeholder paths in the public projection, with AI/no-packaging labels; no database rows are rewritten. Approved existing photos are retained, and source records are in hosting-excluded docs. See [image register](docs/IMAGE_RIGHTS_REGISTER.md) and [exact business input requirements](docs/OWNER_INPUT_REQUIREMENTS.md).

Run `node.exe scripts/qa-domains.mjs` for read-only Production domain/metadata/retired-route/source-exposure checks. Domain configuration remains Vercel canonical, with apex redirecting to www. Real purchasing remains disabled.
