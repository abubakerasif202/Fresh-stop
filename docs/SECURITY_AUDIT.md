# Security and dependency audit

## Final continuation review — 20 October 2026

The independent source review initially found product stock/price races, incomplete idempotency binding, arbitrary error-message persistence/logging and nonrecoverable email claims. These were corrected with transaction row locks and snapshot checks, complete normalized checkout binding, safe error codes, expiring email leases, provider idempotency and bounded retry. Final source review approved these changes with no remaining actionable critical/high findings in the reviewed scope. Local test/build results are recorded in RELEASE_HANDOFF; historical verification statements below describe the earlier wave only.

Stripe identity is pinned to `acct_1USJ2G7k4A7HyNzJ` in test mode before Checkout/webhook operations. Wrong-account keys cannot enable operations. Explicitly cancelled orders receiving late payment stay cancelled and enter manual payment review. Refund events do not initiate refunds or silently restock. Order access uses stored random-token hashes plus separate expiring HMAC email credentials, fragment links and no-referrer confirmation pages.

Current dependency checks: `npm audit --omit=dev` reports zero; full `npm audit` retains five HIGH development-chain advisories. Registry `braces` latest is still 3.0.3, so no patched override exists. No forced downgrade was applied. Treat this as an unresolved development-tool dependency risk, not a clean full audit. Avoid untrusted glob patterns in lint tooling.

Scope: only what was run on branch `feat/fresh-stop-ecommerce-final-hardening`. The production build was NOT verified (see Verification).

## Dependencies (npm audit)

| Command | Before | After |
|---|---|---|
| `npm audit --omit=dev` | 0 vulnerabilities | 0 vulnerabilities (no change needed) |
| `npm audit` (incl. dev) | 5 high | 5 high (unfixable, dev-only) |

Remaining advisory: `braces` <=3.0.3, GHSA-vfj7-8cjw-p6xm (stack-exhaustion DoS on deeply nested patterns, CWE-674, CVSS 7.5).
Chain: eslint-config-next -> @next/eslint-plugin-next -> fast-glob 3.3.1 -> micromatch 4.0.8 -> braces 3.0.3 (all transitive, dev-only).

- No patched `braces` exists on the registry (latest published is 3.0.3, inside the affected range), so an `overrides` entry cannot fix it.
- `npm audit fix --force` would downgrade eslint-config-next to 14.2.35 (breaking, not a real fix); not applied.
- Exploitability: only reachable if attacker-controlled glob patterns reach lint tooling at build or dev time. Not shipped to production and not reachable at runtime. Accepted risk; revisit when braces publishes a fix.
- Next.js: installed 15.5.28 is the latest 15.x on the registry (`npm view next@15 version`), so no patched 15.x bump is available. The existing `overrides.next.postcss` (8.5.30) is retained.
- package.json and package-lock.json were not changed.
- Observation: `@stripe/stripe-js` is a dependency but is not imported anywhere in `src` (Checkout is a server-side redirect). Candidate for removal.

## Hygiene changes

- `scripts/export-session-logs.mjs`: removed the unused `resolve` import; `npm run lint` (max-warnings=0) exits 0.
- `.gitignore`: added `.env*` (+ `!.env.example`), `session-logs/`, `.mcp.json`, `.claude/`, `.codex/`, `.agents/`, `.remember/`, `skills-lock.json`, `/artifacts/full-audit/`, artifact png/jpg/json, sqlite files, local pg data dirs, `.next-*`. Existing entries untouched. No secret-bearing files are tracked (`git ls-files` shows only `.env.example`). Previously tracked `artifacts/**` files stay tracked; ignoring does not untrack.
- `.vercelignore`: added `session-logs`, `.remember`, `prisma/*.db`, `prisma/*.sqlite`, pg data dirs, `*.tsbuildinfo`, `*.log`. It already excluded `.env*`, `.claude`, `.codex`, `.agents`, `.mcp.json`, `artifacts`, `assets`, `docs`.

## Headers (next.config.ts)

Added on all routes: Content-Security-Policy, Strict-Transport-Security (2 years, includeSubDomains), Permissions-Policy, Cross-Origin-Opener-Policy; `poweredByHeader: false`. Existing X-Content-Type-Options, X-Frame-Options DENY and Referrer-Policy are kept.

CSP: `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (+ `'unsafe-eval'` in dev only) + js.stripe.com; `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self' https://checkout.stripe.com`; Stripe hosts in frame-src/connect-src; `upgrade-insecure-requests` in production.

Residual: `'unsafe-inline'` for scripts is required by Next's inline bootstrap scripts without per-request nonces (a nonce would force dynamic rendering of every page). The only `dangerouslySetInnerHTML` uses are JSON-LD.

Verified with `next dev` plus curl: headers present and well formed (dev variant, including unsafe-eval and ws). Production-mode values were not curl-verified because the build did not complete.

## Admin auth and rate limiting

- `src/middleware.ts` matcher covers `/admin/:path*` and `/api/admin/:path*`; handlers also call `requireAdmin` (defence in depth). With no ADMIN_PASSWORD set, curl to `/admin` and POST `/api/admin/products` both returned 503 (fails closed).
- Credential compare uses constant-time `safeEqual` for both user and password with no short-circuit.
- Lockout: 10 failed attempts per 15 minutes per IP, checked before credential comparison, shared via Upstash. Without Upstash vars in production or on Vercel, `sharedRateLimit` returns `unavailable` and admin returns 503 (fail closed: admin is unusable until Upstash is configured, never unlimited). Outside production it falls back to an in-memory limiter.
- Basic Auth risks (accepted, documented): credentials are sent on every request (HTTPS and HSTS mitigate), no logout, no MFA, browser caches credentials. A signed-session login was not added (not small and safe enough here). Recommend a long random ADMIN_PASSWORD and a firewall allowlist for /admin.
- `sameOrigin` (admin-route.ts) provides a CSRF origin check; because browsers auto-send Basic Auth, every admin mutation handler should call it (not audited per handler).
- `getClientIp` trusts `x-vercel-forwarded-for` on Vercel and `x-forwarded-for` elsewhere (spoofable if not behind a trusted proxy).

## Endpoint protection (route handlers in src/app/api)

| Route | Methods | Protection |
|---|---|---|
| /api/admin/delivery | GET POST PATCH | middleware + requireAdmin |
| /api/admin/orders | GET PATCH | middleware + requireAdmin |
| /api/admin/pricing | GET PATCH | middleware + requireAdmin |
| /api/admin/pricing/export | GET | middleware + requireAdmin |
| /api/admin/product-images | GET | middleware + requireAdmin |
| /api/admin/products | GET POST | middleware + requireAdmin |
| /api/admin/products/[id] | PATCH | middleware + requireAdmin |
| /api/checkout/stripe | POST | public by design (creates a pending order and Stripe session); no rate limit in current code |
| /api/webhooks/stripe | POST | Stripe signature verification (owned by the payments agent) |
| /api/orders/lookup | POST | public lookup; no rate limit in current code |
| /api/delivery/check | POST GET | public, no mutation; no rate limit |
| /api/checkout, /api/pickup-slots | GET/POST | `purchaseRetired` stub |
| /api/products | GET | public read |

No server actions (`"use server"`) exist. Only `src/middleware.ts` references the rate limiter in `src`.

## Findings in files not owned

1. `src/app/api/checkout/stripe/route.ts`, `src/app/api/orders/lookup/route.ts`, `src/app/api/delivery/check/route.ts`: none call `sharedRateLimit`/`getClientIp`. Add `sharedRateLimit` (fail closed when `unavailable`) to checkout and order lookup (token guessing).
2. `src/lib/email.ts:36`: `console.log` prints the customer email address when RESEND_API_KEY is missing (PII in logs). Log only the order number.
3. `src/app/api/checkout/stripe/route.ts:138,172`: success and cancel URLs come from `NEXT_PUBLIC_SITE_URL || SITE_URL` (env, not user input). Confirm the order token is passed in success_url as `?t=`.
4. Next loads `.env.local` during `next build` and `next dev` (output showed "Environments: .env.local"). An explicit DATABASE_URL in the process env wins, but other variables there (Stripe, Resend, Supabase keys) are also loaded. Keep overriding DATABASE_URL and DATABASE_URL_UNPOOLED, and consider overriding STRIPE_SECRET_KEY when building.
5. Grep for sk_live/sk_test/whsec_/re_ patterns over src, scripts, prisma and next.config.ts found no hardcoded secrets. No SSRF-prone server fetch: the only server-side `fetch` targets `UPSTASH_REDIS_REST_URL` (env, https enforced). Client fetches use relative same-origin paths.
6. `dangerouslySetInnerHTML`: `products/(catalogue)/page.tsx:54` and `products/[slug]/page.tsx:62` use `jsonLdString` (confirm it escapes `<`); `stores/page.tsx:30` escapes `<`.

## Verification (commands actually run)

- `npm run lint`: exit 0, 0 warnings.
- `npm run typecheck`: exit 0.
- `npm test`: 77 pass, 0 fail.
- `npm run build`: NOT verified. Compile, lint and type steps passed; page-data generation failed at `/stores` because database `fresh_stop_dev` did not yet exist on the local Postgres. Re-run once the DB is created and migrated.
