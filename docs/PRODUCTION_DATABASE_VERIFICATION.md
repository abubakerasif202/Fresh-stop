# Production database verification — 18 October 2026

## Verified identity and scope

The owner supplied authorized session-pooler access for Supabase project `asjjjivkmugbcruzdhju`, Sydney region. Credentials are not retained in repository files or documentation. Verification used read-only transactions and a read-only session option. No customer records were read, and no database write, migration or import ran. The final release gate later detected stale Production credentials (Prisma P1000) while the supplied connection still built successfully; the two Vercel Production database secrets were refreshed privately for this same verified project. No database schema or row configuration changed.

The database contains 172 Product rows, 12 Category rows and zero Order rows. All 172 products are marked published; the existing public projection excludes family-mixed-box, leaving 171 public products in 11 populated categories. The 171 live public records exactly match database ID, slug, image URL, category ID and category slug. Sorted projection SHA-256 on both sides: `893be03d9238f44df51920430e87c0e2ecd9d0c987230b546509e792ad6f2f91`.

The earlier public integration/connector reference `idzicziwqkeqqverxrpq` could not be accessed and was not proof of the actual runtime database. The separate 11-product integration database is also not Production. These historical access blockers are superseded by this successful identity check, not by changing environment variables.

## Approved SQL comparison

| Requirement | Actual result |
|---|---|
| Product.price | float8, nullable |
| Product.unit | text, nullable |
| Product.imageAlt | text, nullable |
| Product.isPublished | bool, NOT NULL, default true |
| Product_isPublished_idx | full btree on isPublished, valid and ready |
| Product_categoryId_idx | full btree on categoryId, valid and ready |
| Product primary/slug uniqueness | primary ID and unique slug indexes present |
| All six Prisma models | scripts/check-database-schema.ts: compatible true, findings [] |

The schema already satisfies `production-schema-upgrade.sql`. Do not reapply it merely to create a migration record. No additive change was necessary; no schema backup or database rollback is needed for this release because no DDL/DML ran. Private metadata and aggregate verification reports are in ignored `.vercel/` in the release worktree.

## Data integrity snapshot

161 rows have unknown prices and 161 unknown units. This is permitted by the schema and enquiry-only model. No duplicate product IDs/slugs, orphan categories, negative price fields or blank name/slug/image URL values were found. Product-row MD5 snapshot ordered by ID: `25f539c3b7078e7d8e3be78ac5b4310b`. This records the verification snapshot; it is not a backup or proof of all business facts. No orders, stock or product fields were changed.

## Reverification and future migration controls

Supply an authorized connection through ignored local environment configuration or approved secret storage, then run `npx.cmd tsx scripts/check-database-schema.ts`. Never paste credentials into chat or logs. Rotate the password shared during this session; updating application connection secrets is a separate deliberate operation if they share that credential. Never substitute the separate integration database.

Before any future approved DDL, export a schema backup through trusted PostgreSQL tooling into private storage, record aggregate row counts/digests, confirm the public fingerprint again, inspect the exact required additive diff and take a restorable platform backup where required. Use bounded locks/transactions. Repeat schema and integrity checks after the change. Application rollback uses the prior Vercel deployment; never drop publication columns or restore NOT NULL automatically, as that can lose data or fail on the 161 unknown values.
