import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { catalogueCandidates, catalogueCategories, GENERATED_IMAGE_SLUGS, PLACEHOLDER_IMAGE_URL, plannedProduce } from "./catalogue-candidates";

const root = process.cwd();
const baseline = JSON.parse(readFileSync(path.join(root, "src/data/catalogue-baseline.json"), "utf8")) as { products: { slug: string; name: string }[] };
const manifest = JSON.parse(readFileSync(path.join(root, "artifacts/image-generation/new-image-manifest.json"), "utf8")) as { slug: string; name: string; prompt: string; targetPath: string; status: string }[];

/** Lower-case, drop brackets/punctuation, singularise each word crudely. */
const normaliseName = (name: string) =>
  name.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean)
    .map(w => (w.endsWith("ies") ? `${w.slice(0, -3)}y` : w.endsWith("oes") ? w.slice(0, -2) : w.endsWith("ss") || w.endsWith("us") ? w : w.endsWith("s") ? w.slice(0, -1) : w)).join(" ");

test("candidate slugs are unique and kebab-case", () => {
  const slugs = catalogueCandidates.map(c => c.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of slugs) assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("candidate normalised names are unique", () => {
  const seen = new Map<string, string>();
  for (const c of catalogueCandidates) {
    const key = normaliseName(c.name);
    assert.ok(!seen.has(key), `${c.slug} duplicates ${seen.get(key)} ("${key}")`);
    seen.set(key, c.slug);
  }
});

test("candidates do not duplicate published baseline products by slug", () => {
  const baselineSlugs = new Set(baseline.products.map(p => p.slug));
  for (const c of catalogueCandidates) assert.ok(!baselineSlugs.has(c.slug), `${c.slug} already exists in baseline`);
});

test("category slugs are unique and every candidate category exists", () => {
  const slugs: string[] = catalogueCategories.map(c => c.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const required of ["fruits", "vegetables", "rice-grains", "pantry", "frozen", "drinks", "condiments", "leafy-greens", "herbs", "specialty-produce"]) assert.ok(slugs.includes(required), required);
  for (const c of catalogueCandidates) assert.ok(slugs.includes(c.categorySlug), `${c.slug}: unknown category ${c.categorySlug}`);
});

test("every non-placeholder imageUrl resolves to a file under public/", () => {
  for (const c of catalogueCandidates) {
    if (c.imageUrl === PLACEHOLDER_IMAGE_URL) continue;
    assert.ok(c.imageUrl.startsWith("/"), c.slug);
    assert.ok(existsSync(path.join(root, "public", c.imageUrl)), `${c.slug}: missing ${c.imageUrl}`);
  }
  assert.ok(existsSync(path.join(root, "public", PLACEHOLDER_IMAGE_URL)));
});

test("placeholder kind and url stay consistent", () => {
  for (const c of catalogueCandidates) assert.equal(c.imageKind === "placeholder", c.imageUrl === PLACEHOLDER_IMAGE_URL, c.slug);
});

test("all candidates are staged with null price and unit and evidence", () => {
  for (const c of catalogueCandidates) {
    assert.equal(c.publicationStatus, "staged", c.slug);
    assert.equal(c.price, null, c.slug);
    assert.equal(c.unit, null, c.slug);
    assert.ok(c.evidence.length > 0, c.slug);
  }
});

test("descriptions carry no price, stock, availability or certification claims", () => {
  const banned = [/\$/, /\d\s*(aud|dollars?|cents?)\b/i, /\b\d+(\.\d+)?\s*(\/|per)\s*(kg|ea|each)/i, /in stock/i, /available/i, /organic/i, /certified/i];
  for (const c of catalogueCandidates) for (const re of banned) assert.ok(!re.test(c.description), `${c.slug}: description matches ${re}`);
});

test("planned produce is the staged expansion and has a pending image manifest", () => {
  const bySlug = new Map(catalogueCandidates.map(c => [c.slug, c]));
  assert.equal(manifest.length, plannedProduce.length);
  for (const [slug, name] of plannedProduce) {
    const c = bySlug.get(slug);
    assert.ok(c, slug);
    assert.equal(c.name, name);
    assert.deepEqual(c.evidence, ["Catalogue-planning range (unverified availability)"]);
    const m = manifest.find(e => e.slug === slug);
    assert.ok(m, `manifest entry for ${slug}`);
    assert.equal(m.targetPath, `public/products/ai/${slug}.webp`);
    assert.match(m.prompt, /^Ultra-realistic premium e-commerce product photograph of .+, centred, square 1:1/);
    if (GENERATED_IMAGE_SLUGS.has(slug)) assert.equal(c.imageKind, "ai-illustration");
    else { assert.equal(c.imageKind, "placeholder"); assert.equal(m.status, "pending"); }
  }
});
