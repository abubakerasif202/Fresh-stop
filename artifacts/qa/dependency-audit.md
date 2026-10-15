# Dependency audit (2026-10-16)

Initial `npm audit --json`: **7 findings: 6 high, 1 moderate**. These are seven affected package nodes, not seven independent root vulnerabilities.

| Package node | Severity | Cause and resolution |
| --- | --- | --- |
| postcss | high | Next bundled PostCSS 8.4.31. Four advisories affect CSS stringify/source-map handling: GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849. Targeted Next dependency override to PostCSS 8.5.30 removes all affected ranges. |
| next | moderate | Propagated PostCSS finding; resolved by the same override, preserving Next 15.5.28. |
| braces | high | GHSA-vfj7-8cjw-p6xm: nested pattern stack exhaustion. Latest registry version is 3.0.3; advisory lists no patched release. Retained pending upstream patch. |
| micromatch | high | Propagates braces finding; development lint dependency only. |
| fast-glob | high | Propagates braces finding; development lint dependency only. |
| @next/eslint-plugin-next | high | Propagates braces finding; development lint dependency only. |
| eslint-config-next | high | Propagates braces finding; development lint dependency only. |

The remaining five findings are one unpatched root vulnerability in the development lint chain. They are not hidden or suppressed. npm proposes downgrading eslint-config-next to 14.2.35, which mismatches Next 15 and loses current lint rules; this is not a safe compatible patch. No `npm audit fix --force`, framework major upgrade, or advisory suppression was used. Keep lint patterns repository-controlled and do not accept attacker-supplied glob patterns.

## Verification

- `npm view braces version`: 3.0.3.
- `npm view postcss version`: 8.5.30.
- `npm ls postcss`: Next, Tailwind PostCSS and direct PostCSS all resolve to 8.5.30, valid tree.
- `npm audit --omit=dev --json`: **0 production vulnerabilities**, exit 0.
- Full install/audit: **5 high development findings**, all documented above.
- `npm install` initially hit Windows EPERM during Prisma engine generation because another running process held its DLL. Dependency tree was installed with `--ignore-scripts`; final Prisma generation and build are separate release checks.
- An early typecheck overlapped generated `.next` cleanup and reported missing generated route files (TS6053); final validation must run after the production build.

## Sources

- [Braces advisory: affected <=3.0.3; no patched version](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [PostCSS source-map incomplete fix](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp)
- Other advisory IDs above are linked in `npm audit --json`; PostCSS 8.5.30 exceeds every affected range.
