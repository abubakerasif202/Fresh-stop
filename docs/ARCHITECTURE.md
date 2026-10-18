# Architecture

Fresh Stop is a Next.js 15 App Router enquiry catalogue with React 19, TypeScript, Tailwind CSS 4 and Prisma 5/PostgreSQL. The supplied Fresh Stop logo, cream/green/red tokens, produce illustrations and lightweight CSS motion are preserved.

## Request and data flow

`src/app/(store)` contains home, catalogue/search/category filters, product details, stores, wholesale, delivery enquiries, About, Contact and FAQ. `src/components` contains navigation, product cards, native enquiry dialogs and motion. Search/category state lives in URL parameters; no customer cart or payment state exists.

`src/lib/catalogue-data.ts` reads only published products in database mode and projects explicit public fields. Prices, inventory and customer records do not enter public APIs or Product JSON-LD. Product schema has no offers or fictional ratings. Baseline seeded marketing claims are neutralised; later staff edits remain visible.

`CATALOGUE_DATA_SOURCE=reviewed-snapshot` combines a public-only baseline and staged proposals for local/Preview review. It throws in Vercel Production. This mode never falls back automatically, and admin mutations and historical-order reads are blocked. The 171-product snapshot is not production inventory.

Prisma models: StoreBranch, Category, Product, BranchInventory, DeliveryZone and Order. Integration schema drift is checked by `scripts/check-database-schema.ts`; proposed compatibility SQL is separate from catalogue import and never runs automatically on install/build.

## Security and integrations

`src/middleware.ts` protects `/admin` and `/api/admin/*` with HTTP Basic Auth and shared Upstash rate limiting; API handlers recheck authorization. Missing admin/Redis configuration fails closed in hosted environments. Admin writes enforce origin checks and product input validation. Historical order APIs use no-store responses.

Public enquiry links launch telephone, email or WhatsApp applications. No web form backend, email delivery provider or payment processor is configured. Retired purchase/lookup/delivery-slot endpoints return 410 before reading bodies or connecting to the database. Legacy order schema remains for protected historical administration.

## Assets and provenance

Public assets are in `public/brand`, `public/products` and `public/images`. AI images are identified as illustrative; branded items without verified photography keep honest placeholders. Original supplied shop photos and derivatives are internal review only: ignored by Git and excluded by `.vercelignore`. Baseline image path classification alone does not prove provenance.

## Hosting

The linked hosting project is Vercel `fresh-stop`; Git remote is `abubakerasif202/Fresh-stop`. Production aliases include `freshstop.com.au`, `www.freshstop.com.au` and `fresh-stop.vercel.app`. Build/production status and limitations are recorded in TEST_REPORT and HANDOFF.

The products list page/loading boundary is under products/(catalogue), preserving /products URLs while leaving sibling detail lookup outside its immediate streaming fallback. Metadata streaming is disabled for recognized User-Agent requests through the supported Next htmlLimitedBots configuration; HTTP tests include empty-UA404 status separately.

## Owner-requested illustrative assets

The catalogue public projection applies the 12-entry `catalogue-illustrations` mapping only over the shared placeholder. This presentation layer avoids mutating Production records and preserves subsequent owner image edits. Snapshot candidates reference the same optimized assets. Card and detail views add generic AI/no-product-packaging disclosure. AI classification continues to derive from the `/products/ai/` path, keeping API, image handling and SEO consistent. Source records and generated masters remain outside hosting.
