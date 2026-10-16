# Catalogue conversion QA evidence

## Baseline

Captured read-only from https://fresh-stop.vercel.app on 16 October 2026:

- `artifacts/catalogue-qa/before-home-375.png`
- `artifacts/catalogue-qa/before-home-1440.png`
- `artifacts/catalogue-qa/before-products-375.png`
- `artifacts/catalogue-qa/before-products-1440.png`

No customer order, checkout, contact form or other production write was performed.

## Browser checks

Run the catalogue browser assertions against a local reviewed-snapshot server. The Playwright package and Chromium are QA tools only and are kept outside application dependencies:

```bash
DATABASE_URL='postgresql://catalogue:catalogue@127.0.0.1:59999/fresh_stop_build' \
CATALOGUE_DATA_SOURCE=reviewed-snapshot VERCEL_ENV=preview \
  npm run start -- -p 3100

QA_TOOL_ROOT=/path/to/qa-tools \
BASE_URL=http://127.0.0.1:3100 \
CHROMIUM_PATH="$(command -v chromium-browser)" \
  node scripts/qa-catalogue.mjs
```

The final run passed 68 assertions across the homepage, catalogue, wholesale, home delivery and stores. It covered 20 viewport combinations at 320, 375, 768 and 1440 pixels, product details, search, category navigation, loaded images, contact links, unauthenticated admin guard, retired customer endpoint GET/POST responses, reduced motion, keyboard focus and mobile-menu Escape behavior. Axe reported zero WCAG 2.1 A/AA violations on all five routes at 375 and 1440 pixels. There were no broken images or browser runtime errors. Results are in `artifacts/catalogue-qa/browser-report.json`; desktop and mobile screenshots are stored beside it.

The script never submits real customer orders. Its POST requests are restricted to localhost and target retired `/api/checkout`, `/api/orders/lookup`, `/api/pickup-slots` and `/api/delivery/check` endpoints only.

Original shop photos are for internal product verification only and must not appear in public after screenshots.

## Release identity investigation

GitHub CLI and Vercel CLI both identify the authenticated account as `abubakerasif202`; a commit on `origin/main` also maps that owner to `Abubakarasif202@hotmail.com`. The local Git config is `Fresh Stop Developer <dev@freshstop.com.au>`, so the release commit must use the verified GitHub owner identity with a one-command `git -c` override. Persistent Git config will remain unchanged. Verify the branch Preview deployment and its Ready status from GitHub/Vercel after the push. No deployment permission is bypassed. Production remains subject to review and approval.
