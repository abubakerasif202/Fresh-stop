# Fresh Stop — final website audit (23 October 2026)

Scope: branch `main` at `adeb28b` (production deployment `dpl_5kLcHMTY8zXhJHatsPCiZvaDUyXL`, READY).

## Method
Local: `npm ci`, typecheck, lint, full test suite against the disposable local PostgreSQL, production build. Live: HTTP probes of `https://www.freshstop.com.au` (no payments, no writes), Vercel deployment list and 7-day runtime-error clusters.

## Findings
| Area | Result |
| --- | --- |
| Public routes `/ /products /stores /cart /checkout /wholesale /home-delivery /contact /faq /orders /sitemap.xml /robots.txt` | all 200; unknown path 404 |
| `/admin` unauthenticated | 401 |
| Stripe webhook, unsigned POST | 400 generic body |
| `/api/checkout`, empty body | 400 field-level validation, no data leak |
| Security headers | CSP, HSTS (2y), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy present |
| Business contact | only `+61 423 936 586` / `wa.me/61423936586` on the home page |
| Canonical | `https://www.freshstop.com.au`; apex `freshstop.com.au` returns 308 |
| Catalogue API | products carry server-side `priceCents`, unit, tax category, approval status, availability (`BACKORDER`) |
| Local quality gates | typecheck PASS, lint PASS (0 warnings), 396/396 tests PASS, build PASS (27 pages) |

## Problems discovered
1. **Historical database outages (16–22 Oct)** in runtime logs: Supabase pooler `P1000` auth failures, `ECIRCUITBREAKER` (pooler blocking after repeated auth failures), `EMAXCONNSESSION` (session-mode pool of 15), and `P2024` pool timeouts at `connection_limit=1`. The last occurrence in the 7-day window was 22 Oct 04:04 UTC on an older deployment; the current deployment serves the catalogue correctly.
2. **Unreviewed uncommitted edit found in the old local checkout** that stripped `client_reference_id`, `metadata`, `payment_intent_data`, `customer_email` and `expires_at` from the Stripe session. That would have broken webhook reconciliation and stock-reservation expiry. It was reverted and saved outside the repo; it is not part of any branch.
3. The previous local branch `feat/fresh-stop-ecommerce-final-hardening` was 17 commits behind `main` and superseded by it; work continues from `main`.
4. Five dev-only high advisories (`eslint-config-next` → `braces`); no patched version exists. Production dependency audit is clean per the 22 Oct handoff (not re-run here).

## Not verified in this audit
Lighthouse/Core Web Vitals, 320–1440px browser screenshots, a real card payment, a provider-signed webhook, Resend delivery, and the expiry scheduler. See `STRIPE_LIVE_READINESS.md`.
