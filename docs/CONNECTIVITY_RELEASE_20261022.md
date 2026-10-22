# Fresh Stop connectivity and release — 22 October 2026

This addendum supersedes the earlier runtime and npm-audit blockers in `WSL_RELEASE_EVIDENCE_20261022.md`. Application source is unchanged from `4cd652bac05f7bc7d9a29de1cdc6d22f6c50fb5d`.

## Database cause and repair

Authenticated Supabase access now identifies production `asjjjivkmugbcruzdhju`, organisation `bdrowtpmnxbzgpsfczyi`, Sydney `ap-southeast-2`, ACTIVE_HEALTHY. Its applied network restrictions permit IPv4 and IPv6. The provider's transaction pooler is `aws-0-ap-southeast-2.pooler.supabase.com:6543` with the project-specific username and SCRAM support.

Provider Supavisor logs show repeated password authentication failures during the failing deployed requests at 03:33:47–03:34:28 UTC. Independently, the owner's supplied production credential authenticates read-only on both session 5432 and transaction 6543. Deployment variables existed, but their protected values were not inspected/exported. This supports unusable deployed authentication, rather than absent environment variables or a network restriction; bytewise comparison of protected old values was not performed.

Preview now uses an explicitly authorised **separate** project `wayiuoynkegtebdxzwry` in the verified organisation and region. Paid branching was unavailable without a Pro upgrade; the owner confirmed the separate US$0/month project. Initial migrations ran only after confirming this new database was empty. Repository catalogue content seeded 172 products, 12 categories and two stores; no production/customer/order records were copied. All products remain unapproved for payments. Database credentials and generated Preview admin credentials were entered privately as branch-specific Preview variables.

Production bindings were corrected separately using the privately recovered owner-supplied, revalidated connection. Runtime uses transaction 6543 with `pgbouncer=true`, TLS, bounded pool/connection settings; the migration connection uses session 5432. Production canonical configuration is now `https://www.freshstop.com.au`; payment environment remains false. These bindings require a fresh production deployment before live resolution can be claimed.

## Deployed Preview proof

- Deployment `dpl_HLVqAYRdQN5U79Ui4omsjagpgtZr`, source SHA `4cd652bac05f7bc7d9a29de1cdc6d22f6c50fb5d`, READY.
- https://fresh-stop-qm5uh9ipl-abubakerasif202s-projects.vercel.app
- Authenticated HTTP smoke: **6 passed, 0 failed**: `/`, `/stores`, `/api/products`, `/api/checkout/status`, `/contact`, `/admin`. Admin correctly returns 401; checkout reports disabled.
- Deployed browser/accessibility suite: **66 passed, 0 failed**, widths 320, 375, 430, 768, 1024, 1440 and 1920. Includes 42 responsive route checks, 12 axe scans, canonical/contact/footer assertions, APIs and zero browser runtime errors.
- Positive Preview authentication returns 200 for dashboard, products, orders and settings. An exploratory request to `/admin/inventory` returned 404 because no such route exists; the actual inventory/pricing management route is `/admin/pricing`. The corrected route smoke is recorded separately, with the original attempt retained privately. Corrected HTTP smoke: **11 passed, 0 failed**, including five authenticated admin routes. Additional cart/admin responsive checks: **11 passed, 0 failed**.

## Security evidence

- `npm audit --omit=dev --fetch-timeout=10000 --fetch-retries=0 --json`: exit 0, **zero vulnerabilities**. [Structured result](evidence/npm-production-security-audit-20261022.json).
- Focused webhook/payment tests: **57 passed, 0 failed, 0 skipped**, on genuine isolated local PostgreSQL 17.11. [Raw TAP](evidence/stripe-security-regressions-20261022.tap), [source hashes and scope](evidence/stripe-focused-security-20261022.json).
- Coverage includes exact-body signature validation, missing/tampered signatures, account/mode isolation, duplicate/replay, concurrent inventory effects, retry/refund ordering, rollback and generic error/key non-disclosure.
- These tests mock provider responses; they do not establish provider-signed webhook delivery, a completed sandbox payment or verified live merchant identity. No real charge was attempted.
- Prior full unchanged-source validation: application tests 396/396; Linux PowerShell helpers 23/23; local interaction browser checks 114/114 plus supplemental 66/66; typecheck, lint, production build and diff checks passed. The old failing remote browser results remain historical, not silently removed.

## Production backup and additive migration

The private full backup remains preserved: 420201 bytes, SHA256 `0b36755e6d5b58cab670689ef0afac75f398912b2f8385c2ab73d10a7218e807`. It passed the documented isolated Supabase PostgreSQL restore rehearsal, with all 14 application tables' row counts/checksums, RLS and ACL matching. Logical recovery excludes platform settings and role passwords.

After successful isolated Preview runtime, the read-only tax preflight and full scalar comparison were refreshed. The four exact additive tax migrations were applied through authenticated Supabase migration history as version `20261022040402`, `fresh_stop_additive_tax_approval_bridge_20261022`, within a single atomic DO statement with bounded lock/statement timeouts. No historical init migration, Prisma reset or historical migration replay occurred.

Postflight passes: no missing/mismatched Prisma scalar columns, both nullable tax approval columns exist, final validated actor/timestamp constraint passes. Counts, all original-column checksums, RLS and grants are identical across all 14 application tables before/after. Production paid-checkout approval remains false. The backup was not modified.

## Checkout handoff

The owner requested checkout activation and approved reviewed commerce values, then requested generated values. Current production still has 172 products, zero saved positive selling prices, zero verified stock counts and 161 missing units. Existing tax labels are not independently validated product tax approvals. A live Stripe credential pasted into chat requires rotation and private replacement; connected Stripe authentication currently requires reconnection.

[Proposed prices](evidence/checkout-proposed-prices-20261022.csv) carry forward the repository's demonstration price/unit suggestions. They are proposals, not verified market quotes or saved selling prices; stock counts and tax approval remain blank/unapproved. Physical inventory cannot be generated. Delivery fees/postcodes also require actual business settings. Payments remain closed pending those values, a verified merchant account, private rotated credentials, provider-signed webhook and completed sandbox-payment evidence.

Rollback retains additive columns and restores the preceding application deployment if required; do not delete business data or replay init migrations. Prior production deployment: `dpl_BZinEsSnineZCrSbRyxwf8PvuJur`, SHA `7b60bff30aca784d7a89c5db762f58f779971e9d`. Its catalogue was already failing, so it is a source rollback reference, not a claimed healthy database credential fallback.
