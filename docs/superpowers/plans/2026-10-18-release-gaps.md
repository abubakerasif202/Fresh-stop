# Fresh Stop remaining release gaps

> Execution: native implementation with independent scoped evidence work and final review.

**Goal:** Close safely verifiable gaps after the 18 October release; retain truthful blockers.
**Architecture:** Preserve the enquiry catalogue and existing Vercel/Supabase infrastructure. Work from released main in an isolated worktree, never from unrelated dirty changes.
**Spec:** The user's five-priority continuation request in this session.

## Constraints and review focus

- No invented business facts, packaging, rights, stock or prices; no purchasing features.
- Verify actual Production identity before SQL; schema reads and public API fingerprints must match.
- DDL only if required, approved, backed up and additive. Do not mutate data to test Production.
- No blanket dependency upgrades or audit suppression; require compatible patched versions and fresh QA.
- Domain aliases must have consistent metadata while preserving the intended primary origin.

## Tasks and completion evidence

- [x] Database: recheck authorized MCP/direct access, compare Product nullability/defaults/index definition with approved SQL and schema checker, record integrity counts/digests. If blocked, record exact access requirement; do no DDL.
- [x] Images: produce a 22-record rights/identity register (12 placeholders + 10 photo-path records); replace only assets with verified approval, otherwise name exact missing evidence.
- [x] Business: produce owner-input requirements for privacy/terms/refund/delivery/pickup using only verified repository facts.
- [x] Dependencies: capture baseline audit and tests; inspect advisories and primary patch metadata; apply smallest compatible fix if available; rerun audit and full tests/lint/typecheck/builds.
- [ ] SEO/QA: check current aliases, redirects, canonical/OG/robots/sitemap, published product links, enquiry-only API status, mobile navigation/overflow and errors. Add a reproducible read-only regression check for a real discovered gap.
- [ ] Release: independent review, exact diff check, update HANDOFF/AUDIT/TEST/DEPLOYMENT with dated evidence, commit/push/PR through existing workflow, verify actual Production deployment and smoke it. Preserve rollback to prior verified deployment.

## Verification

Windows Node 22: `npm.cmd ci`, `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd audit --json`, `npm.cmd audit --omit=dev`, snapshot and authorized database-mode `npm.cmd run build`; read-only public HTTP/browser checks. Never print environment values or customer data.

## Scope decisions and verified results

- Owner-supplied actual database access succeeds; project asjjjivkmugbcruzdhju matches all 171 live products. Six models pass; SQL requirements already satisfied, so no migration/backup/rollback action is required.
- Owner approved continued use of 10 photographs and removal of public source links. Source records preserved internally; images unchanged.
- Owner subsequently requested and approved 12 labelled generic food illustrations. All generated without branded packaging, integrated only over known placeholder paths, and protected by tests preserving actual owner images. Displayed placeholders are now zero; actual packshots remain unverified.
- Exact policy/service intake created without fabricated copy. Five development-only advisories remain because compatible upstream fixes are unavailable; runtime audit zero.
- 78 tests, lint, typecheck, optimized snapshot build and 15 responsive combinations pass. Deployment/mobile/final alias checks remain release gates, not assumed complete.
