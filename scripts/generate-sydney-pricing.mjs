/**
 * Deterministic generator for the Fresh Stop pricing SUGGESTION dataset.
 * Run: npx tsx scripts/generate-sydney-pricing.mjs
 *
 * Inputs : src/data/catalogue-baseline.json, src/data/catalogue-candidates.ts,
 *          src/data/pricing-estimates.json (unverified suggestions), src/data/market-observations.json (real observations only)
 * Outputs: src/data/sydney-pricing-dataset.json, src/data/market-references.json
 * Rules live in src/data/pricing-build.ts. Nothing here can mark a price APPROVED; the builder has no such path
 * and assertSafePricingDataset() throws before anything is written.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { catalogueCandidates } from "../src/data/catalogue-candidates.ts";
import { assertSafePricingDataset, buildMarketReferences, buildPricingDataset } from "../src/data/pricing-build.ts";

const dataDir = path.resolve(import.meta.dirname, "../src/data");
const readJson = name => JSON.parse(readFileSync(path.join(dataDir, name), "utf8"));

const baseline = readJson("catalogue-baseline.json");
const estimates = readJson("pricing-estimates.json");
const observed = readJson("market-observations.json");

const sources = [
  ...baseline.products.map(p => ({ id: p.id, slug: p.slug, name: p.name, categorySlug: p.category.slug, origin: "BASELINE" })),
  ...catalogueCandidates.map(c => ({ id: `staged-${c.slug}`, slug: c.slug, name: c.name, categorySlug: c.categorySlug, origin: "CANDIDATE" }))
];

const dataset = buildPricingDataset(sources, estimates);
const references = buildMarketReferences(dataset, estimates, observed);
assertSafePricingDataset(dataset, references);

const write = (name, value) => writeFileSync(path.join(dataDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
write("sydney-pricing-dataset.json", dataset);
write("market-references.json", references);

const count = pred => dataset.filter(pred).length;
console.log(`Pricing suggestions: ${dataset.length} products, ${count(e => e.approvalStatus === "PENDING")} PENDING, ${count(e => e.needsReview)} need review.`);
console.log(`Market references: ${references.length} (${references.filter(r => r.kind === "OBSERVED").length} OBSERVED, ${references.filter(r => r.kind === "ESTIMATE").length} ESTIMATE).`);
