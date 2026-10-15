# Fresh Stop — Multi-Branch Online Sydney Greengrocer 🍏🥦🍊

> **Fresh Stop** is an enterprise-grade, modern e-commerce web application inspired by Sydney greengrocers like [Fruitezy](https://fruitezy.com.au/). It is designed from the ground up for multi-branch store operations, intelligent Sydney postcode delivery routing, produce catalog filtering, and dual-fulfillment order processing.

---

## 📍 Store Branches

Fresh Stop operates two physical locations in Southern Sydney for in-store shopping and fast 2-hour Click & Collect pickup:

| Branch | Address | Phone | Trading Hours | Google Maps |
| :--- | :--- | :--- | :--- | :--- |
| **Rockdale** | Shop 1, 2-4 King Street, Rockdale NSW 2216 | `(02) 9567 1188` | Mon–Sat: 7:00am–7:30pm<br>Sun: 8:00am–6:00pm | [Directions](https://maps.google.com/?q=Shop+1+2-4+King+Street+Rockdale+NSW+2216) |
| **Riverwood** | 319 Belmore Rd, Riverwood NSW 2210 | `(02) 9534 8822` | Mon–Sat: 7:00am–7:30pm<br>Sun: 8:00am–6:00pm | [Directions](https://maps.app.goo.gl/QACdGqVR9zqDeseG9) |

---

## 🚀 Key Features

- **Multi-Branch Operations & Context Switching**:
  - Global branch selector modal persisted with Zustand localStorage middleware.
  - Hydration-safe state handling for seamless Next.js App Router server/client transitions.
- **Sydney Postcode Delivery Zone Engine**:
  - Real-time postcode checking for local corridors:
    - **St George & Bayside** (`2216`, `2217`, `2218`, `2220`, `2205`, `2207`, `2219`, `2221`) dispatched from **Rockdale**.
    - **Canterbury-Bankstown** (`2210`, `2209`, `2211`, `2212`, `2196`, `2213`, `2208`, `2214`) dispatched from **Riverwood**.
  - Flat $9.99 delivery fee with automatic **FREE delivery** for orders $\ge \$150.00$.
  - Enforced $50.00 minimum spend for delivery corridors.
- **Produce Catalog, Specials & Search**:
  - Filter pills for Weekly Specials and Categories (Fruits, Vegetables, Organics, Curated Seasonal Produce Boxes).
  - Instant text search preserving filter state.
  - High-performance Server Components with Incremental Static Regeneration (`revalidate = 60`).
- **Dual-Fulfillment Checkout**:
  - **Click & Collect**: Ready in 2 hours with timeslot selection (e.g. today / tomorrow).
  - **Sydney Home Delivery**: Real-time postcode verification and threshold calculator.
  - Payment options: **Pay on pickup / delivery**. Online card payments are disabled and rejected by the server.
- **Customer Order Confirmation**:
  - Itemized receipt breakdown, fulfillment instructions, assigned store branch hub, and order status tracking.
- **Store Operator Admin Dashboard**:
  - Live fulfillment monitoring portal (`export const dynamic = "force-dynamic"`).
  - Real-time KPI summary cards (Total Orders, Click & Collect, Deliveries, GMV Revenue).
  - Inline order lifecycle advancement: `RECEIVED` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `DISPATCHED` $\rightarrow$ `COMPLETED`.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) with PostgreSQL (Supabase-compatible)
- **Client State**: [Zustand](https://github.com/pmndrs/zustand) with persistence middleware
- **Payments**: Pay on pickup / delivery only; Stripe is not connected.

---

## 📂 Project Structure

```
fresh-stop/
├── prisma/
│   ├── schema.prisma              # StoreBranch, Category, Product, DeliveryZone, Order models
│   ├── seed.ts                    # Seeding Rockdale & Riverwood branches + products + zones
├── src/
│   ├── app/
│   │   ├── (store)/
│   │   │   ├── page.tsx           # Homepage, Hero, Specials, Curated Boxes
│   │   │   ├── products/page.tsx  # Catalog browsing, filtering, and search
│   │   │   ├── stores/page.tsx    # Stores directory, hours & map links
│   │   │   ├── checkout/page.tsx  # Dual-fulfillment checkout
│   │   │   └── order-confirmation/[orderId]/page.tsx
│   │   ├── admin/page.tsx         # Store operator fulfillment portal
│   │   ├── api/
│   │   │   ├── products/route.ts  # Catalog query API
│   │   │   ├── delivery/check/route.ts # Postcode & delivery fee check API
│   │   │   ├── checkout/route.ts  # Order creation & validation API
│   │   │   └── admin/orders/route.ts # Admin order status management API
│   │   ├── layout.tsx             # Root layout with Header, Modal, Cart Drawer & Footer
│   │   └── globals.css            # Tailwind CSS v4 design tokens
│   ├── components/
│   │   ├── layout/                # Header, Footer, BranchSelectorModal
│   │   ├── cart/                  # CartDrawer & postcode calculator
│   │   ├── products/              # ProductCard with specials badge
│   │   └── home/                  # HeroBanner, StoresShowcase
│   └── lib/
│       ├── db.ts                  # PrismaClient singleton
│       ├── delivery.ts            # Sydney postcode engine & threshold rules
│       ├── delivery.test.ts       # Delivery engine unit tests
│       └── store/                 # Zustand stores (useCartStore, useBranchStore)
├── test-e2e-order.mjs             # End-to-end customer journey & admin test
├── package.json
└── tsconfig.json
```

---

## 🚦 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/abubakerasif202/Fresh-stop.git
cd Fresh-stop
npm install
```

### 2. Database Setup & Seeding
```bash
# Push Prisma schema to Postgres (needs DATABASE_URL, see env table)
npm run db:push

# Seed store branches, categories, produce, and delivery zones
ALLOW_DEVELOPMENT_SEED=1 npm run db:seed
```

### 2b. Environment variables
Copy `.env.example` to `.env`. `ADMIN_PASSWORD` is **required** to access `/admin` and `/api/admin/*` (HTTP Basic Auth, user `ADMIN_USER`, default `admin`). If unset, admin routes return 503. Serve the site over HTTPS in production.

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_USER` | No (default `admin`) | Basic Auth username for `/admin` and `/api/admin/*`. |
| `DATABASE_URL` | Yes | Postgres connection string (pooled). Configure for the intended Vercel environment. |
| `DATABASE_URL_UNPOOLED` | Yes | Direct Postgres connection string used by `prisma db push`. Same value as `DATABASE_URL` locally. |
| `ADMIN_PASSWORD` | Yes | Basic Auth password. Unset = admin returns 503 (fail closed). |
| `ORDER_TOKEN_SECRET` | Yes in production | HMAC secret (min 16 chars) for order confirmation links. Generate with `openssl rand -base64 32`. |
| `NEXT_PUBLIC_SITE_URL` | No (default `https://fresh-stop.vercel.app`) | Public base URL used for `metadataBase`. |

**Rate limiting.** Checkout, order lookup and admin authentication use an atomic shared Redis REST limiter. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in production and Preview. Missing configuration or an outage returns 503. Only local development uses in-memory limits. These variables are server-only; never publish their values.

**Migrating from the old SQLite database.** `npx tsx scripts/export-sqlite.ts` (run while the schema is still SQLite) writes `prisma/export/sqlite-export.json` (gitignored). Then `npx prisma db push && npx tsx scripts/import-data.ts` loads catalogue, branches, delivery zones and inventory into Postgres (idempotent, IDs preserved). Orders are skipped unless you pass `--with-orders`.

**Order confirmation privacy.** Confirmation links carry a signed token (`?t=...`). Without a valid token the page shows only the order number and status; visitors can verify the email used at checkout to view full details. No login is required, and existing orders keep working through email verification.

> Card payments are not connected: there is no Stripe integration yet, so checkout accepts Pay at pickup / on delivery only.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the storefront, or [http://localhost:3000/admin](http://localhost:3000/admin) for the store operator portal.

### 4. Run Test Suite
```bash
# Unit tests
npm test

# Production build
npm run build

# End-to-end journey test (with server running)
node --import tsx test-e2e-order.mjs
```

---

## 📜 License
Private proprietary software built for Fresh Stop Sydney. All rights reserved.


## Validation and release safeguards

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. The build requires a reachable PostgreSQL database for prerendered catalogue pages. Never point test scripts or the seed command at production. The seed command refuses remote hosts and production environments.

For local API tests set `BASE_URL` to the local server, `ALLOW_LOCAL_E2E_WRITES=1` and the matching local `ADMIN_PASSWORD`. Run `node --import tsx test-e2e-order.mjs` against a disposable development database. Browser QA uses `scripts/qa-browser.mjs`; set `QA_TOOL_ROOT` to a directory containing Playwright and @axe-core/playwright.

Checkout requires a stable request identifier to recover duplicate submissions, with authoritative database prices and dispatch-branch availability. The browser retains a payload fingerprint and retry UUID in session storage across reloads without storing contact fields there. Confirmation tokens require a stable `ORDER_TOKEN_SECRET`. Order lookup accepts the reference plus checkout email; this is knowledge-based verification, not email inbox ownership verification.

Deployment requires approval. Do not run seeds or schema pushes against live records. Shared Redis provisioning and environment configuration must be verified before releasing ordering.
