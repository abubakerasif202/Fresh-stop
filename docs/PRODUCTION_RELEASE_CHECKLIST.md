# Production release checklist

Before any deploy: `npm ci && npm run typecheck && npm run lint && npm test && npm run build` (tests need `node scripts/db-local.mjs start`; never point tests at production).

- [ ] Branch merged via PR; Vercel production deployment READY
- [ ] `/api/products` returns catalogue; `/`, `/products`, `/stores` 200 (not 500/503)
- [ ] `/admin` 401 without credentials
- [ ] Unsigned webhook POST returns 400
- [ ] Canonical is `https://www.freshstop.com.au`; apex redirects
- [ ] Only the authorised phone/WhatsApp appear
- [ ] `/api/checkout/status` matches intended state
- [ ] Runtime-error clusters (Vercel) empty for the new deployment after 30 min

## Database
Use `DATABASE_URL` (pooled, transaction mode, `pgbouncer=true`, sensible `connection_limit`) and `DATABASE_URL_UNPOOLED` for migrations. Rotating the DB password requires updating both Vercel environments at once; repeated bad logins trip the pooler circuit breaker (`ECIRCUITBREAKER`) for several minutes. Never reset production; migrations are additive only; take a private backup first.

## Pause sales
Set `paidCheckoutApproved=false` in admin and `PAID_CHECKOUT_ENABLED=false` in Vercel, redeploy. Keep webhooks running.

## Rollback
Promote the previous READY production deployment (e.g. `dpl_5AqYchV3qD8Rz7L9p87PnQpfeRkg`, rollback candidate) in Vercel. Do not revert schema or delete orders.
