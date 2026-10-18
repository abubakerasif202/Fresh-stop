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

Current reviewed snapshot: **171 products / 11 categories**, including **161 staged proposals**, **149 illustrative AI candidate images** and **12 honest branded placeholders**. These are not production stock totals. The available integration database has 11 products / 5 categories / 2 stores; a read-only schema audit found five compatibility discrepancies, now fixed by the approved additive upgrade. The owner-approved additive schema upgrade has now been applied; existing record digests/counts are unchanged and no catalogue import was performed.

```powershell
npx tsx scripts/check-database-schema.ts
npx tsx scripts/generate-catalogue-evidence.ts
npx tsx scripts/catalogue-image-audit.ts
```

The first command audits metadata read-only and exits 1 when incompatible. The latter two regenerate offline review evidence without querying a database. The test runner now works across Windows/POSIX shells; run native Node for your installed dependency platform.

Handoff: [Architecture](docs/ARCHITECTURE.md), [Setup](docs/SETUP.md), [Deployment and rollback](docs/DEPLOYMENT.md), [Operations](docs/OPERATIONS.md), [Handoff](docs/HANDOFF.md), [Audit](docs/AUDIT_REPORT.md), [Test results](docs/TEST_REPORT.md).

## Release

Use the linked GitHub/Vercel project. The current completion request authorizes code deployment after verification; production still requires a compatible database, real hosting secrets, a successful database-mode build and smoke tests. The proposed SQL upgrade is reviewable in docs/production-schema-upgrade.sql and requires explicit approval before live execution. Catalogue import/publication is separate and remains approval-gated. A Ready deployment is followed by route, asset and interaction checks; it is not itself proof of a working release.
