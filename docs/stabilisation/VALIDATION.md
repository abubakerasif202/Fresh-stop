# Validation — Windows PowerShell 7

Correction branch starts from verified origin/main adeb28b60f7d5e0eb51b115ee31e3e8ed50e8442 in C:\Users\abuba\.worktrees\fresh-stop-stabilisation. The original dirty checkout was preserved. Windows-native npm ci installed dependencies; Prisma migrations/tests used disposable localhost:54329 only. Production environment values were not imported into test execution.

| Check | Final result |
| --- | --- |
| npm run typecheck | PASS |
| npm run lint | PASS |
| npm test | PASS: 404 tests, 0 failed, 0 skipped, 14 suites |
| npm run build | PASS |
| npm audit --omit=dev | PASS: 0 vulnerabilities |
| git diff --check | PASS |
| Focused admin tests | PASS: 41/41 |
| Focused cart tests | PASS: 15/15 |
| Live Playwright route matrix | PASS: 12/12 at 375 and 1440; zero page errors/overflow |

The first pre-final test run had 398 pass/1 fail: a paid-cancellation fixture represented a zero-dollar order while expecting a refund warning. The fixture now records a genuine paid amount. The final 404/404 run supersedes that result; the failure was not hidden or skipped.

Live home/products/stores/checkout/orders returned 200; admin and admin orders API returned 401 unauthenticated. Search for banana returned Cavendish Bananas. Populated checkout renders payment continuation; both pickup branches are present. These were read-only browsing/local cart operations, with no order submission.

Apex redirects to www; public phone/WhatsApp numbers and AB Web Studio link were inspected in the rendered DOM. Delivery postcode 2216: 4999 cents below minimum; 5000 and 14999 cents cost 999 cents delivery; 15000 cents gets free delivery. Postcode 3000 is outside approved zones. Order tracking without an access code returns generic HTTP 400. These limited checks do not claim exhaustive authentication/privacy penetration testing or successful privileged login.

Payment/refund tests use mock Stripe responses with real disposable PostgreSQL transactions. No actual Stripe-provider payment, signed delivery, refund or complete browser payment journey was executed. The connector only supplied test contexts and no complete isolated callback setup. Live Stripe account/webhook/key-revocation checks remain BLOCKED. Production secret presence is not successful integration evidence.

Local Playwright acknowledgement flow: 7 functional checks passed with mocked status/cart/checkout responses; 0 browser errors. Before consent, the explicit checkbox is unchecked/focused and a repeat submit sends no further request. After consent the request contains literal true. Responsive checks passed at 320/375/768/1440: scrollWidth equals viewport at all four widths. The initial 320px measurement was 341px; adding min-w-0 to the summary grid item fixed the intrinsic-width overflow. Typecheck/lint and production build passed after this CSS change; the 404-test run covers the unchanged functional code.

Raw local logs/screenshots are under artifacts/stabilisation, outside committed evidence to avoid noisy machine paths and generated artifacts. These browser checks do not exercise a real Stripe provider or create an order.

Independent code-reviewer and TypeScript review found no actionable issues in the correction diff. Existing partially-refunded fulfilment policy remains unresolved as documented in READINESS.md.
