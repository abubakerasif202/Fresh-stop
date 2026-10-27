# Fresh Stop poster-inspired homepage — 28 October 2026

## Implementation

The Next.js App Router homepage now uses a full-width illustrated market scene, a dominant live-text **FRESH STOP** heading, fresh green/white styling, photographic category cards, catalogue-driven weekly specials, store visits, everyday shopping benefits, and existing wholesale/delivery contact actions.

The sticky header retains the official logo, catalogue search and cart. Primary links include real catalogue/contact routes and homepage section anchors. Wholesale, delivery and store links remain in the mobile navigation and footer. The first-visit fullscreen intro was removed from the root layout so customers can see the homepage immediately. Footer branding, legal links, contact forms, Stripe, checkout, database integrations, metadata and canonicals were retained.

Product cards still use the existing public catalogue projection and cart components. Specials require an approved database price, purchasability, and an approved higher comparison price from that projection. No discount is fabricated. When none qualify, a contact-based specials panel appears. Existing store addresses/hours are read at runtime; invalid hours are omitted.

## Assets and provenance

| Asset | Use and provenance |
| --- | --- |
| `public/images/market-scene-illustration.webp` | New AI-generated illustration made with the built-in imagegen tool, inspired by the user-supplied poster. 1536 × 1024, 310,094 bytes, WebP quality 85. Desktop hero and a complementary store-section crop. Contains the requested tomatoes, carrots, bananas, oranges, strawberries, broccoli, capsicums and greens. Next.js provides responsive WebP/AVIF delivery. |
| `public/brand/fresh-stop-primary.webp` | Existing official logo, retained in the header. |
| `public/products/strawberries-250g.webp`, `fresh-broccoli-head.webp`, `cavendish-bananas-1kg.webp` | Existing owner-approved reference photographs. Source declarations are retained in `IMAGE_SOURCE_RECORDS.md` and owner approval in `IMAGE_RIGHTS_REGISTER.md`; no new independent license verification is claimed. |
| `public/products/ai/{red-lentils,basmati-rice,plain-paratha,fruit-juice,green-olives}.webp` | Existing generic catalogue illustrations reused for categories; live product images continue to come from the catalogue. |
| User-supplied `WhatsApp Image 2026-10-19 at 3.11.35 PM.jpeg` | Art-direction reference only. The full poster is not embedded behind website text. |

**No genuine storefront photograph was found.** The existing `src/data/store-photos.ts` registry is empty and restricts shop photographs to internal review. Both uses of the new scene visibly disclose that it is an illustration/artist's impression; image alt text also states this. It must not be described as the actual Rockdale or Riverwood storefront. Genuine photography is still needed to satisfy the real-storefront-photo part of the brief.

Generated original (retained locally): `artifacts/homepage-redesign/market-scene-source.png`. Original tool output: `/home/abuba/.codex/generated_images/01a17e07-92dd-76d2-b418-863aad248e2a/exec-44c22a98-23e7-4b58-9e24-f7557b69d3a6.png`.

### Generation prompt

> Create one premium realistic editorial-style digital illustration for a Fresh Stop Australian greengrocer website hero, very wide landscape 3:2 or wider. Inspired by an energetic local fruit market poster: blue natural sky, warm morning sunshine from upper right, green leaves framing top corners, vivid red tomatoes, bunches of carrots with tops, bananas, oranges cut and whole, strawberries, broccoli, red and green capsicums and leafy greens arranged abundantly in natural weathered wooden produce crates along the lower foreground. Behind them, a welcoming modest single-storey suburban Australian fruit market with green fascia sign reading exactly FRESH STOP in simple white letters, cream corrugated awning, open entrance with lit produce aisles. Shopfront should occupy the RIGHT 60% of the image, with its full sign and entrance visible above the foreground produce. LEFT 40% predominantly pale blue sky and soft sunlit greenery, quiet low detail to leave ample space for large live website heading and buttons. Produce forms a low framing border, do not fill centre with fruit. Natural believable textures and warm high quality commercial lighting, sophisticated rich green palette with sunshine yellow and fruit red. No floating logos, no stop-sign emblem, no posters, no extra words, no promotional text or prices, no Rockdale, no watermarks. This is explicitly an illustrative imagined storefront, not a verified photograph. The provided conversation poster is mood inspiration only; create a fresh composition suitable for web text overlay, not a recreation of the entire poster.

## Maps evidence

The stored Riverwood URL `https://maps.app.goo.gl/QACdGqVR9zqDeseG9` was checked with an HTTP request on 28 October 2026. Google returned HTTP 302 to a `/maps/place/Fresh+Stop+Riverwood/` business listing with place identifier `/g/11zxgylj2c`. The hero uses an existing stored business listing, preferring Rockdale only if a business-listing URL exists. This is Riverwood; older address-only database records fall back to the same existing, verified Riverwood link only while that branch is active. Rockdale retains its existing address-search directions link; no Rockdale listing was invented. `isMapsBusinessLink` checks URL format/host, not business ownership or continued listing availability.

## Local validation

The user subsequently authorized pushing to main and deploying after deep review. No remote database mutation, secret change, price approval or live payment is part of this release. Validation uses the disposable local PostgreSQL database at `localhost:54329/fresh_stop_dev` with the existing migrations. The production build and all 440 automated tests use the disposable database. Before/after visual QA uses the explicit reviewed catalogue snapshot with indicative prices disabled: the disposable database contains synthetic test branches, which were preserved. Purchasable cart behavior is covered by database-backed tests and checked separately when products are available.

Commands (PowerShell from the repository):

```powershell
$env:DATABASE_URL = 'postgresql://fs_dev:fs_dev@localhost:54329/fresh_stop_dev'
$env:DATABASE_URL_UNPOOLED = $env:DATABASE_URL
$env:CATALOGUE_DATA_SOURCE = 'database'
$env:NEXT_PUBLIC_STOREFRONT_DEMO = 'false'
node scripts/db-local.mjs start
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run start -- --port 3100
```

Browser QA runs in WSL using the existing external QA dependency installation:

```sh
QA_TOOL_ROOT=/home/abuba/tools/fresh-stop-qa-20261022 \
BASE_URL=http://localhost:3101 node scripts/qa-homepage-redesign.mjs
```

Production security headers upgrade insecure requests on non-loopback IP addresses. This run uses a local HTTP forwarding proxy on `localhost:3101` to the Windows server at `172.21.0.1:3100`, preserving application security headers. Use `http://localhost:3100` when browser and server share an OS.

Evidence and screenshots are saved locally in `artifacts/homepage-redesign/`. The focused browser script covers the requested widths plus 1024 and 1920, WCAG Axe checks, loaded images, heading/canonical, mobile menu and Escape focus return, cart drawer, catalogue/cart/checkout/store/contact/wholesale/delivery route responses, and browser errors. No order is placed.

Before screenshots: `before-1440.png`, `before-390.png`. After screenshots: `after-{320,375,390,768,1024,1440,1920}.png`. First-screen screenshots: `hero-1440.png`, `hero-390.png`. Machine-readable report: `browser-report.json`. Console logs: `lint.log`, `typecheck.log`, `tests.log`, `build.log`.

## Scope and release

Existing unrelated worktree changes, including line-ending differences across many files, are preserved. Only homepage/header/layout changes, the new asset, supporting helpers/tests, browser script and this report belong to this work. No preview deployment is required. Production release evidence is recorded in the local `artifacts/homepage-redesign/release-report.json` after main is pushed and the deployment is verified. Local verification does not establish independent verification of all business data.

## Review and check results

- Full test suite: **440 passed, 0 failed, 0 skipped** (15 suites).
- Full lint, explicit TypeScript check and production build: passed. No dependency changes were needed.
- Production dependency audit: **0 vulnerabilities** (`npm audit --omit=dev`).
- Deep review fixes: removed the first-screen intro overlay; corrected small-screen banner overflow; preserved the complete sign at wide desktop sizes; kept foreground produce visible; rejected inherited/invalid opening-hours keys; added a verified Riverwood listing fallback for older records; retained catalogue approval gates for specials.
- Homepage visual checks: 320, 375, 390, 768, 1024, 1440 and 1920px; no horizontal overflow or broken homepage images. Axe checks at 320, 390, 768 and 1440px report zero violations.
- The local production checkout status endpoint correctly returns `503 RATE_LIMIT_UNAVAILABLE` without a shared rate limiter. The browser report records this environment limitation separately rather than weakening the limiter or masking unexpected service errors. The local snapshot has no purchasable products, so browser cart quantity/persistence is unavailable there; database-backed cart/checkout tests passed. Before release, both live pickup and delivery checkout status endpoints returned HTTP 200 with `enabled: true`; they must be checked again after release.
- No new API handlers, pricing writes, payment code, database schema changes or secret changes were introduced.
