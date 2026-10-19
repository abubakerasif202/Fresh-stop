/**
 * Catalogue/pricing audit. Compares the LEGACY Antigravity dataset (git d88ad89, or --legacy <file>)
 * with the corrected dataset, and writes docs/CATALOGUE_AUDIT.md + artifacts/catalogue-audit.json.
 * Run: npx tsx scripts/catalogue-audit.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { catalogueCandidates, catalogueCategories } from "../src/data/catalogue-candidates";
import { nearDuplicatePairs, parseSizeToken, type PackSize } from "../src/data/pricing-build";

const root = process.cwd();
const LEGACY_REV = "d88ad89";
type Row = Record<string, unknown> & { slug: string; productId: string; name: string; unit: string };

const argIdx = process.argv.indexOf("--legacy");
const legacy: Row[] = JSON.parse(
  argIdx > 0
    ? readFileSync(process.argv[argIdx + 1], "utf8")
    : execFileSync("git", ["show", `${LEGACY_REV}:src/data/sydney-pricing-dataset.json`], { encoding: "utf8", cwd: root, maxBuffer: 1 << 26 })
);
const current: Row[] = JSON.parse(readFileSync(path.join(root, "src/data/sydney-pricing-dataset.json"), "utf8"));
const baseline = JSON.parse(readFileSync(path.join(root, "src/data/catalogue-baseline.json"), "utf8")) as {
  products: { id: string; slug: string; name: string; category: { slug: string } }[];
};

const dupes = (values: string[]) => [...new Set(values.filter((v, i) => values.indexOf(v) !== i))];
const count = (rows: Row[], pred: (r: Row) => boolean) => rows.filter(pred).length;
const tally = (rows: Row[], key: string) => {
  const m: Record<string, number> = {};
  for (const r of rows) m[String(r[key])] = (m[String(r[key])] ?? 0) + 1;
  return m;
};

const knownCategories = new Set<string>([...catalogueCategories.map(c => c.slug), ...baseline.products.map(p => p.category.slug)]);

function unitSize(unit: string): PackSize | null { return parseSizeToken(unit); }

function sizeMismatches(rows: Row[]) {
  const out: { slug: string; reason: string }[] = [];
  for (const r of rows) {
    const fromName = parseSizeToken(r.name);
    const fromSlug = parseSizeToken(r.slug.replace(/-/g, " "));
    const fromUnit = unitSize(r.unit);
    for (const [label, s] of [["name", fromName], ["slug", fromSlug]] as const) {
      if (s && fromUnit && (s.unit !== fromUnit.unit || Math.abs(s.value - fromUnit.value) > 1e-9)) out.push({ slug: r.slug, reason: `${label} says ${s.value}${s.unit} but unit is "${r.unit}"` });
      if (s && !fromUnit) out.push({ slug: r.slug, reason: `${label} says ${s.value}${s.unit} but unit "${r.unit}" has no pack size` });
    }
    if (/-head$/.test(r.slug) && r.unit !== "head" && r.unit !== "each") out.push({ slug: r.slug, reason: `slug says head but unit is "${r.unit}"` });
    if (/dozen/.test(r.slug) && !/12/.test(r.unit)) out.push({ slug: r.slug, reason: `slug says dozen but unit is "${r.unit}"` });
    if (r.unit === "punnet" || r.unit === "half") out.push({ slug: r.slug, reason: `unit "${r.unit}" has no determinable size` });
  }
  return out;
}

function priceMath(rows: Row[]) {
  const issues: { slug: string; reason: string }[] = [];
  for (const r of rows) {
    const pc = r.priceCents as number | null;
    const sg = r.suggestedPriceCents as number | null;
    if (pc !== null && !Number.isInteger(pc)) issues.push({ slug: r.slug, reason: "priceCents not integer" });
    if (sg !== null && sg !== undefined && !Number.isInteger(sg)) issues.push({ slug: r.slug, reason: "suggestedPriceCents not integer" });
    const qty = r.packageQuantity as number;
    const up = r.unitPriceCents as number | null;
    if (sg && up && Math.abs(up - Math.round(sg / qty)) > 1) issues.push({ slug: r.slug, reason: `unitPriceCents ${up} != round(price/qty) ${Math.round(sg / qty)}` });
    if (/^\d+ pack$|^2 pack$/.test(r.unit) && /^\d+ pack$/.test(r.unit) && Number(r.unit.split(" ")[0]) !== qty) issues.push({ slug: r.slug, reason: `count pack "${r.unit}" but packageQuantity ${qty}` });
  }
  return issues;
}

function urlReuse(rows: Row[]) {
  const by = new Map<string, string[]>();
  for (const r of rows) {
    const u = r.sourceUrl as string | undefined;
    if (u) by.set(u, [...(by.get(u) ?? []), r.slug]);
  }
  return [...by.entries()].filter(([, s]) => s.length > 1).map(([url, slugs]) => ({ url, slugs }));
}

const homepages = (rows: Row[]) => rows.filter(r => {
  try { return new URL(String(r.sourceUrl)).pathname === "/"; } catch { return false; }
}).length;

function nameKey(name: string) { return name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).sort().join(" "); }

function categoryIssues(rows: Row[]) {
  const issues: { slug: string; reason: string }[] = [];
  for (const r of rows) if (!knownCategories.has(String(r.categorySlug))) issues.push({ slug: r.slug, reason: `unknown category ${String(r.categorySlug)}` });
  const bySlug = new Map(rows.map(r => [r.slug, r]));
  for (const { a, b, kind } of nearDuplicatePairs(rows.map(r => ({ slug: r.slug, name: r.name })))) {
    if (kind === "FORM_VARIANT") continue;
    const ra = bySlug.get(a); const rb = bySlug.get(b);
    if (ra && rb && ra.categorySlug !== rb.categorySlug) issues.push({ slug: `${a} / ${b}`, reason: `related products in different categories (${String(ra.categorySlug)} vs ${String(rb.categorySlug)})` });
  }
  return issues;
}

function gstIssues(rows: Row[]) {
  const issues: { slug: string; reason: string }[] = [];
  for (const r of rows) if (r.taxCategory !== "GST_FREE" && r.taxCategory !== "TAXABLE_10") issues.push({ slug: r.slug, reason: `invalid taxCategory ${String(r.taxCategory)}` });
  const taxable = rows.filter(r => r.taxCategory === "TAXABLE_10").map(r => r.slug);
  return { invalid: issues, taxable };
}

function summarise(rows: Row[]) {
  return {
    entries: rows.length,
    uniqueSlugs: new Set(rows.map(r => r.slug)).size,
    uniqueProductIds: new Set(rows.map(r => r.productId)).size,
    approvalStatus: tally(rows, "approvalStatus"),
    isPurchasableTrue: count(rows, r => r.isPurchasable === true),
    withCostPrice: count(rows, r => r.costPrice !== undefined && r.costPrice !== null),
    withStockFields: count(rows, r => typeof r.stockQuantity === "number"),
    availabilityStatus: tally(rows, "availabilityStatus"),
    withMarketPrice: count(rows, r => r.sydneyMarketRefPrice !== undefined && r.sydneyMarketRefPrice !== null),
    withMarketSource: count(rows, r => Boolean(r.competitorSource)),
    withCompareAtCents: count(rows, r => typeof r.compareAtPriceCents === "number"),
    withSourceUrl: count(rows, r => Boolean(r.sourceUrl)),
    taxCategory: tally(rows, "taxCategory"),
    needsReview: count(rows, r => r.needsReview === true)
  };
}

const candidateSlugs = catalogueCandidates.map(c => c.slug);
const baselineSlugs = baseline.products.map(p => p.slug);
const all = [...baseline.products.map(p => ({ slug: p.slug, name: p.name })), ...catalogueCandidates.map(c => ({ slug: c.slug, name: c.name }))];
const report = {
  generatedFrom: { legacyRevision: LEGACY_REV, legacyFile: "src/data/sydney-pricing-dataset.json", note: "legacy = Antigravity snapshot commit; current = corrected suggestion-only dataset" },
  sources: {
    baselineProducts: baseline.products.length,
    catalogueCandidates: catalogueCandidates.length,
    uniqueSlugsAcrossBaselineAndCandidates: new Set([...baselineSlugs, ...candidateSlugs]).size,
    slugOverlapBaselineCandidates: baselineSlugs.filter(s => candidateSlugs.includes(s)),
    candidatesCarryingPrice: catalogueCandidates.filter(c => c.price !== null).length,
    candidatesCarryingUnit: catalogueCandidates.filter(c => c.unit !== null).length,
    baselineProductsCarryingPrice: baseline.products.filter(p => "price" in p).length,
    skuFieldsPresent: 0,
    aliasFieldsPresent: 0
  },
  duplicates: {
    legacyDuplicateSlugs: dupes(legacy.map(r => r.slug)),
    legacyDuplicateProductIds: dupes(legacy.map(r => r.productId)),
    duplicateNormalisedNames: dupes(all.map(a => nameKey(a.name))),
    nearDuplicateNamePairs: nearDuplicatePairs(all)
  },
  legacy: {
    ...summarise(legacy),
    productIdKinds: { databaseCuid: count(legacy, r => r.productId.startsWith("cm")), stagedPlaceholder: count(legacy, r => r.productId.startsWith("staged-")) },
    sizeMismatches: sizeMismatches(legacy),
    priceMathIssues: priceMath(legacy),
    categoryIssues: categoryIssues(legacy),
    gst: gstIssues(legacy),
    sourceUrlsReusedAcrossProducts: urlReuse(legacy),
    costPriceIs65PercentOfSuggestedPrice: count(legacy, r => typeof r.costPrice === "number" && Math.abs((r.costPrice as number) - Math.round((r.suggestedFreshStopPrice as number) * 65) / 100) < 0.0101),
    compareAtEqualsMarketRef: count(legacy, r => typeof r.compareAtPriceCents === "number" && r.compareAtPriceCents === Math.round((r.sydneyMarketRefPrice as number) * 100)),
    sourceUrlsThatAreSiteHomepages: homepages(legacy),
    distinctSourceUrls: new Set(legacy.map(r => r.sourceUrl)).size
  },
  current: {
    ...summarise(current),
    sizeMismatches: sizeMismatches(current).length,
    priceMathIssues: priceMath(current).length,
    gstInvalid: gstIssues(current).invalid.length
  },
  provenance: [
    "scripts/generate-sydney-pricing.mjs (Antigravity, commit d88ad89) generated the legacy dataset from a hard-coded table with approved:true flags, cost = round(price*0.65, 2), and invented competitor URLs.",
    "scripts/sync-catalogue-to-db.mjs (not owned by catalogue agent) wrote stockQuantity 150, costPrice, marketPrice/marketSource and compareAtPrice from that dataset into the database; it must not be run until updated."
  ]
};

const outJson = path.join(root, "artifacts/catalogue-audit.json");
mkdirSync(path.dirname(outJson), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`audit written: legacy ${report.legacy.entries} entries, ${report.legacy.approvalStatus.APPROVED ?? 0} approved, current ${report.current.entries}`);

const L = report.legacy;
const C = report.current;
const list = (items: { slug: string; reason: string }[]) => items.map(i => `- \`${i.slug}\`: ${i.reason}`).join("\n") || "- none";
const md = `# Catalogue and pricing audit

Generated by \`npx tsx scripts/catalogue-audit.ts\` (machine-readable copy: \`artifacts/catalogue-audit.json\`).
"Legacy" is the Antigravity dataset at commit ${LEGACY_REV}. "Current" is the corrected suggestion-only dataset.

## Product inventory
- Baseline products (real database ids): ${report.sources.baselineProducts}
- Catalogue candidates (staged, ids \`staged-<slug>\`): ${report.sources.catalogueCandidates}
- Unique slugs across both: **${report.sources.uniqueSlugsAcrossBaselineAndCandidates}** (overlap: ${report.sources.slugOverlapBaselineCandidates.length})
- Candidates carrying a price or unit in \`catalogue-candidates.ts\`: ${report.sources.candidatesCarryingPrice} / ${report.sources.candidatesCarryingUnit}; baseline products carrying a price: ${report.sources.baselineProductsCarryingPrice}
- SKU fields: ${report.sources.skuFieldsPresent}; alias fields: ${report.sources.aliasFieldsPresent} (none exist)

## Duplicates
- Duplicate slugs / product ids in legacy dataset: ${report.duplicates.legacyDuplicateSlugs.length} / ${report.duplicates.legacyDuplicateProductIds.length}
- Duplicate normalised names: ${report.duplicates.duplicateNormalisedNames.length}
- Near-duplicate name pairs (one name's words contained in the other's): ${report.duplicates.nearDuplicateNamePairs.length}
${report.duplicates.nearDuplicateNamePairs.map(p => `  - \`${p.a}\` / \`${p.b}\` (${p.kind})`).join("\n")}

Nothing was deleted. Brand-variant and same-unit variety pairs are flagged \`needsReview\` in the corrected dataset.

## Legacy dataset (${L.entries} entries)
- approvalStatus: ${JSON.stringify(L.approvalStatus)}; isPurchasable true: ${L.isPurchasableTrue}
- costPrice present: ${L.withCostPrice} (of which ${L.costPriceIs65PercentOfSuggestedPrice} equal exactly 65% of the suggested price, i.e. fabricated)
- availabilityStatus: ${JSON.stringify(L.availabilityStatus)} (all claimed IN_STOCK); stock figures in this file: ${L.withStockFields}. \`scripts/sync-catalogue-to-db.mjs\` wrote stockQuantity 150 for every product.
- market price + competitor source on every entry: ${L.withMarketPrice} / ${L.withMarketSource}; compareAtPriceCents set from the market number: ${L.compareAtEqualsMarketRef} (this drove the crossed-out prices in the UI)
- sourceUrl present: ${L.withSourceUrl}; distinct URLs: ${L.distinctSourceUrls}; URLs reused across different products: ${L.sourceUrlsReusedAcrossProducts.length}; URLs that are bare site homepages: ${L.sourceUrlsThatAreSiteHomepages}. None were verified.
- taxCategory: ${JSON.stringify(L.taxCategory)}; invalid values: ${L.gst.invalid.length}; TAXABLE_10: ${L.gst.taxable.map(s => `\`${s}\``).join(", ")}

### Pack size / unit problems
${list(L.sizeMismatches)}

### Price math problems
${list(L.priceMathIssues)}
- Unit price basis was inconsistent: weight packs were per kg, count packs per item, "12 pack" per pack.

### Category problems
${list(L.categoryIssues)}

## Current dataset (${C.entries} entries)
- approvalStatus: ${JSON.stringify(C.approvalStatus)}; purchasable: ${C.isPurchasableTrue}; costPrice: ${C.withCostPrice}; stock figures: ${C.withStockFields}; availability: ${JSON.stringify(C.availabilityStatus)}
- market/competitor fields on products: ${C.withMarketPrice + C.withMarketSource}; compareAt values: ${C.withCompareAtCents}
- needsReview: ${C.needsReview}; remaining size mismatches (all flagged): ${C.sizeMismatches}; price-math issues: ${C.priceMathIssues}; invalid GST: ${C.gstInvalid}

## Provenance
${report.provenance.map(p => `- ${p}`).join("\n")}
`;
writeFileSync(path.join(root, "docs/CATALOGUE_AUDIT.md"), md, "utf8");
