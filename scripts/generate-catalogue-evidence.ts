/** Offline source inventory. Never connects to or mutates a database. */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import baseline from "../src/data/catalogue-baseline.json";
import { catalogueCandidates, catalogueCategories } from "../src/data/catalogue-candidates";
import { filterCatalogue, publicCatalogueProduct } from "../src/lib/catalogue-data";
import { CONTACT } from "../src/lib/contact";

const products = new Map(baseline.products.map(product => [product.slug, publicCatalogueProduct(product)]));
for (const candidate of catalogueCandidates) {
  if (products.has(candidate.slug)) continue;
  const category = catalogueCategories.find(item => item.slug === candidate.categorySlug);
  if (!category) throw new Error(`Unknown category: ${candidate.categorySlug}`);
  products.set(candidate.slug, publicCatalogueProduct({ ...candidate, id: `staged-${candidate.slug}`, category: { ...category, id: `staged-${category.slug}` } }, "asset-review"));
}
const catalogue = filterCatalogue([...products.values()]);
const categories = [...new Map(catalogue.map(product => [product.category.slug, product.category])).values()].sort((a, b) => a.name.localeCompare(b.name));
const placeholders = catalogue.filter(product => product.imageKind === "placeholder");
const missing = catalogue.filter(product => !existsSync(path.join("public", product.imageUrl)));
if (missing.length) throw new Error(`Missing images: ${missing.map(product => product.slug).join(", ")}`);
const generatedAt = new Date().toISOString().slice(0, 10);
const writeJson = (file: string, value: unknown) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
mkdirSync("docs/evidence", { recursive: true });

const previousPlan = JSON.parse(readFileSync("docs/catalogue-import-plan.json", "utf8"));
writeJson("docs/catalogue-import-plan.json", {
  ...previousPlan,
  generatedAt,
  status: "offline review-only; schema compatibility and owner catalogue approval required before import",
  databaseWritesPerformed: false,
  proposedAdditions: catalogueCandidates.length,
  publicPreviewProducts: catalogue.length,
  activePreviewCategories: categories.length,
  // Counts derive from files only; they do not certify visual or stock approval.
  newAiImages: undefined,
  reusedAiImages: undefined,
  aiCandidateImages: catalogueCandidates.filter(product => product.imageUrl.includes("/ai/")).length,
  pendingBrandedPackshots: placeholders.map(product => product.name),
  products: catalogueCandidates.map(product => ({ ...product, action: "proposed unpublished draft; not confirmed stock" }))
});
writeJson("docs/evidence/product-image-manifest.json", {
  generatedAt,
  status: "offline file inventory; image presence does not establish visual approval, provenance or product availability",
  summary: {
    proposedProducts: catalogueCandidates.length,
    publicPreviewProducts: catalogue.length,
    activePreviewCategories: categories.length,
    aiCandidateImages: catalogueCandidates.filter(product => product.imageUrl.includes("/ai/")).length,
    brandedPlaceholders: placeholders.length,
    baselineImagesRequiringProvenanceConfirmation: catalogue.filter(product => product.source === "database" && product.imageKind === "photo").length,
    brokenReferences: missing.length
  },
  historicalContactSheet: "docs/evidence/product-images-contact-sheet.jpg (earlier 71-image subset; not a complete current inventory)",
  products: catalogue.map(product => ({ slug: product.slug, name: product.name, category: product.category.slug, imageUrl: product.imageUrl, imageAlt: product.imageAlt, imageKind: product.imageKind, source: product.source, bytes: statSync(path.join("public", product.imageUrl)).size }))
});
writeFileSync("public/catalogues/fresh-stop-range.txt", [
  "FRESH STOP — CATALOGUE REVIEW RANGE",
  `Source inventory refreshed ${generatedAt}.`,
  "Includes proposed catalogue additions. This is not a list of confirmed stock or availability.",
  "Contact our team to confirm products, packaging, pricing and delivery arrangements.",
  "AI images on the website are illustrative; branded products may await verified photography.",
  `Enquiries: ${CONTACT.phoneDisplay} | ${CONTACT.email}`,
  "",
  ...categories.flatMap(category => [category.name.toUpperCase(), ...catalogue.filter(product => product.category.slug === category.slug).map(product => `- ${product.name}`), ""])
].join("\n"));
console.log(JSON.stringify({ products: catalogue.length, categories: categories.length, candidates: catalogueCandidates.length, placeholders: placeholders.length, brokenReferences: missing.length, databaseWrites: 0 }));
