// Syncs catalogue IDENTITY (name, slug, category, description, image) into the database.
//
//   node scripts/sync-catalogue-to-db.mjs            # DRY RUN: prints the plan, writes nothing
//   node scripts/sync-catalogue-to-db.mjs --apply    # write (local DB, or remote with ALLOW_REMOTE_DB_WRITE)
//
// Fail-closed contract (never changed by this script):
//   * new products are created PENDING, isPurchasable=false, stockQuantity=null, stockVerified=false,
//     availabilityStatus=UNKNOWN, priceCents/price/costPrice/compareAt = null
//   * a pricing-dataset price is stored ONLY as suggestedPriceCents (priceSource=SUGGESTED) and
//     never as a sellable price; an admin must approve it (priceApprovedBy) before it can sell
//   * existing rows keep any admin-approved price, stock and approval; only identity fields update
//   * no BranchInventory rows are created (availability is unverified)
//   * DATABASE_URL comes from the shell environment only; .env.local is never read here
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assertSafeDatabaseTarget, formatIdentity } from "./db-guard.mjs";
import { catalogueCategories, catalogueCandidates } from "../src/data/catalogue-candidates.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const readJson = (relative) => JSON.parse(readFileSync(`${root}${relative}`, "utf8"));
const apply = process.argv.includes("--apply");

const EXTRA_CATEGORIES = [
  { slug: "boxes", name: "Seasonal Boxes", description: "Curated produce boxes for home cooking" },
  { slug: "dairy", name: "Dairy & Chilled", description: "Farm milk, fresh eggs & artisan cheeses" },
];

function collectProducts() {
  const baseline = readJson("src/data/catalogue-baseline.json");
  const items = [
    ...baseline.products.map((p) => ({ slug: p.slug, name: p.name, categorySlug: p.category.slug, description: p.description, imageUrl: p.imageUrl, imageAlt: p.imageAlt })),
    ...catalogueCandidates.map((c) => ({ slug: c.slug, name: c.name, categorySlug: c.categorySlug, description: c.description, imageUrl: c.imageUrl, imageAlt: c.imageAlt })),
  ];
  const seen = new Set();
  return items.filter((item) => (seen.has(item.slug) ? false : (seen.add(item.slug), true)));
}

/** Fields written on CREATE only. Everything commerce-related stays unset/fail-closed. */
function createData(item, categoryId, suggestion) {
  return {
    name: item.name,
    slug: item.slug,
    categoryId,
    description: item.description || null,
    imageUrl: item.imageUrl,
    imageAlt: item.imageAlt,
    unit: suggestion?.unit ?? null,
    packageQuantity: suggestion?.packageQuantity ?? 1,
    taxCategory: suggestion?.taxCategory ?? "GST_FREE",
    suggestedPriceCents: suggestion?.suggestedPriceCents ?? null,
    priceSource: suggestion?.suggestedPriceCents != null ? "SUGGESTED" : null,
    approvalStatus: "PENDING",
    isPurchasable: false,
    stockVerified: false,
    availabilityStatus: "UNKNOWN",
    isPublished: true,
  };
}

const identityUpdate = (item, categoryId) => ({
  name: item.name,
  categoryId,
  description: item.description || null,
  imageUrl: item.imageUrl,
  imageAlt: item.imageAlt,
});

async function syncCategories(db) {
  const defs = [...catalogueCategories, ...EXTRA_CATEGORIES];
  const map = new Map();
  for (const [index, cat] of defs.entries()) {
    const data = { name: cat.name, description: cat.description, displayOrder: index + 1 };
    const record = apply
      ? await db.category.upsert({ where: { slug: cat.slug }, update: data, create: { slug: cat.slug, ...data } })
      : await db.category.findUnique({ where: { slug: cat.slug } });
    map.set(cat.slug, record?.id ?? `dry-run:${cat.slug}`);
  }
  return map;
}

async function syncProducts(db, categories, suggestions) {
  const counts = { created: 0, updated: 0, skipped: 0 };
  for (const item of collectProducts()) {
    const categoryId = categories.get(item.categorySlug);
    if (!categoryId) {
      console.warn(`Category not found for ${item.categorySlug}; skipping ${item.slug}`);
      counts.skipped++;
      continue;
    }
    const existing = await db.product.findUnique({ where: { slug: item.slug }, select: { id: true, priceApprovedBy: true } });
    counts[existing ? "updated" : "created"]++;
    if (!apply) continue;
    const suggestion = suggestions.get(item.slug);
    if (!existing) {
      await db.product.create({ data: createData(item, categoryId, suggestion) });
      continue;
    }
    const keepSuggestion = !existing.priceApprovedBy && suggestion?.suggestedPriceCents != null;
    await db.product.update({
      where: { id: existing.id },
      data: { ...identityUpdate(item, categoryId), ...(keepSuggestion ? { suggestedPriceCents: suggestion.suggestedPriceCents, priceSource: "SUGGESTED" } : {}) },
    });
  }
  return counts;
}

async function main() {
  const identities = assertSafeDatabaseTarget({ mode: apply ? "write" : "read", label: "sync-catalogue-to-db" });
  console.log(`${apply ? "APPLY" : "DRY RUN"} on ${formatIdentity(identities)}`);
  const suggestions = new Map(readJson("src/data/sydney-pricing-dataset.json").map((row) => [row.slug, row]));
  const db = new PrismaClient({ log: [] });
  try {
    const categories = await syncCategories(db);
    const counts = await syncProducts(db, categories, suggestions);
    console.log(`${apply ? "Sync finished" : "Plan"}:`, counts, `Total products in DB: ${await db.product.count()}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("Sync error:", error instanceof Error ? error.message : "unknown");
  process.exit(1);
});
