/**
 * Idempotent, reviewable import of the draft catalogue additions.
 *
 *   npx tsx scripts/import-catalogue-additions.ts            # DRY RUN: prints the plan, writes nothing
 *   npx tsx scripts/import-catalogue-additions.ts --apply    # create missing drafts (isPublished=false)
 *   npx tsx scripts/import-catalogue-additions.ts --apply --publish
 *                                                            # also list them as "Price available in store"
 *
 * Safety: only INSERTS missing products. Existing rows (matched by slug or normalised
 * name) are never modified, so product IDs, prices and orders are preserved. No branch
 * inventory is created because availability is unverified. A non-local database is
 * refused unless ALLOW_REMOTE_DB_WRITE=yes-i-approved (write) / ALLOW_REMOTE_DB_READ=yes-i-approved (dry run)
 * is set by a human after a backup (see scripts/db-guard.mjs).
 */
import { PrismaClient } from "@prisma/client";
import { assertSafeDatabaseTarget, formatIdentity } from "./db-guard.mjs";
import { existsSync } from "node:fs";
import { CATALOGUE_ADDITIONS } from "../prisma/catalogue-additions";
import { PLACEHOLDER_IMAGE } from "../src/lib/product-commerce";

const normalise = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "").replace(/(es|s)$/, "");

async function main() {
  const apply = process.argv.includes("--apply");
  const publish = process.argv.includes("--publish");
  console.log(formatIdentity(assertSafeDatabaseTarget({ mode: apply ? "write" : "read", label: "import-catalogue-additions" })));
  const db = new PrismaClient();
  const [existing, categories] = await Promise.all([
    db.product.findMany({ select: { name: true, slug: true } }),
    db.category.findMany({ select: { id: true, slug: true } })
  ]);
  const slugs = new Set(existing.map((p) => p.slug));
  const names = new Set(existing.map((p) => normalise(p.name)));
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));

  const plan = CATALOGUE_ADDITIONS.map((a) => {
    const aiFile = `public/products/ai/${a.slug}.webp`;
    const imageUrl = existsSync(aiFile) ? `/products/ai/${a.slug}.webp` : PLACEHOLDER_IMAGE;
    const duplicate = slugs.has(a.slug) || names.has(normalise(a.name));
    const missingCategory = !categoryId.has(a.categorySlug);
    return { ...a, imageUrl, action: duplicate ? "skip (exists)" : missingCategory ? "ERROR (category missing)" : "create" };
  });
  console.table(plan.map(({ name, slug, categorySlug, imageUrl, action }) => ({ name, slug, categorySlug, imageUrl, action })));
  if (plan.some((p) => p.action.startsWith("ERROR"))) throw new Error("Missing category; aborting.");

  if (!apply) {
    console.log(`DRY RUN: ${plan.filter((p) => p.action === "create").length} product(s) would be created ${publish ? "published" : "as unpublished drafts"}. Re-run with --apply.`);
    await db.$disconnect();
    return;
  }
  let created = 0;
  for (const p of plan.filter((x) => x.action === "create")) {
    await db.product.create({
      data: {
        name: p.name, slug: p.slug, categoryId: categoryId.get(p.categorySlug)!,
        price: null, unit: null, imageUrl: p.imageUrl, imageAlt: p.name, isPublished: publish,
        approvalStatus: "PENDING", isPurchasable: false, stockVerified: false, availabilityStatus: "UNKNOWN"
      }
    });
    created++;
  }
  console.log(`Created ${created}; skipped ${plan.length - created}. Total products: ${await db.product.count()}.`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
