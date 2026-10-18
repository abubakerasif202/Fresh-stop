# Local setup

Use one native Node environment per install. This checkout has Windows native dependencies; prefer PowerShell with Node 22. Do not run Windows esbuild/Lightning CSS packages with WSL Node.

```powershell
Set-Location C:\Users\abuba\fresh-stop
npm.cmd ci
Copy-Item .env.example .env.local
$env:CATALOGUE_DATA_SOURCE = "reviewed-snapshot"
npm.cmd run dev
```

`npm ci` is required for a clean install; the pre-audit node_modules contained extraneous retired Stripe/Zustand packages. Do not copy node_modules between platforms. The portable test runner uses Node file discovery and works in cmd, PowerShell and POSIX shells.

Snapshot browsing needs no DB credentials. It contains proposals, not verified stock. To browse actual published data, choose `database` and set real DATABASE_URL. Prisma direct connection tooling uses DATABASE_URL_UNPOOLED. Integration aliases such as POSTGRES_PRISMA_URL do not automatically configure this application's DATABASE_URL.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd audit
npm.cmd audit --omit=dev
$env:CATALOGUE_DATA_SOURCE = "reviewed-snapshot"
$env:VERCEL_ENV = "preview"
npm.cmd run build
npm.cmd start -- --port 3100
```

Stop the dev server before building because both use `.next`. Typecheck after the build regenerates route types. Do not include live credentials in commands, screenshots, logs or documentation. Vercel sensitive secrets may be non-exportable: CLI pulls can contain `[SENSITIVE]`, which is not a valid credential.

Read-only schema check:

```powershell
npx.cmd tsx scripts/check-database-schema.ts
# Explicitly audit an existing integration alias, without changing app configuration:
npx.cmd tsx scripts/check-database-schema.ts --connection-variable=POSTGRES_PRISMA_URL
```

The checker prints metadata findings, not customer data or credentials, and exits 1 when incompatible. It is not a complete foreign-key/migration verifier. Never use `db:push` or a seed against production as a shortcut.
