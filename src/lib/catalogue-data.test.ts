import { catalogueIllustrations } from "@/data/catalogue-illustrations";
import { catalogueCandidates } from "@/data/catalogue-candidates";
import { PLACEHOLDER_IMAGE } from "./product-commerce";
import test from "node:test";
import assert from "node:assert/strict";
import { filterCatalogue, publicCatalogueProduct, usesReviewedSnapshot, getCategories } from "./catalogue-data";

const base = {
  id: "one",
  slug: "carrots",
  name: "Carrots",
  description: "Super special offer!",
  imageUrl: "/products/ai/carrots.webp",
  imageAlt: "Carrots",
  category: { id: "veg", name: "Vegetables", slug: "vegetables" }
};

test("public projection formats pricing, unit metadata and strips private fields", () => {
  const product = publicCatalogueProduct({
    ...base,
    slug: "test-custom-carrots",
    priceCents: 450,
    approvalStatus: "APPROVED",
    priceApprovedBy: "owner@example.test",
    isPurchasable: true,
    stockVerified: true,
    stockQuantity: 10,
    reservedQuantity: 0,
    unit: "kg",
    secret: "private-db-field",
    inventory: [{ isAvailable: true }]
  } as unknown as Parameters<typeof publicCatalogueProduct>[0]);

  // Private internal fields must not leak
  assert.equal("secret" in product, false);
  assert.equal("inventory" in product, false);

  // Core public catalogue & commerce fields must exist
  assert.equal(product.id, "one");
  assert.equal(product.name, "Carrots");
  assert.equal(product.price, 4.5);
  assert.equal(product.priceCents, 450);
  assert.equal(product.unit, "kg");
  assert.equal(product.imageKind, "ai");
  assert.equal(product.taxCategory, "GST_FREE");
  assert.equal(product.isPurchasable, true);
  const noStock = publicCatalogueProduct({ ...base, slug: "test-custom-carrots", priceCents: 450, approvalStatus: "APPROVED", priceApprovedBy: "a", isPurchasable: true } as Parameters<typeof publicCatalogueProduct>[0]);
  assert.equal(noStock.isPurchasable, false, "unverified stock is never purchasable");
  assert.ok(product.unitPriceDisplay?.includes("$4.50/kg"));
});

test("unapproved, suggested or bundled prices are never public and are enquiry-only", () => {
  const cases = [
    { priceCents: 450, approvalStatus: "PENDING", priceApprovedBy: null, isPurchasable: true },
    { priceCents: 450, approvalStatus: "APPROVED", priceApprovedBy: null, isPurchasable: true },
    { price: 4.5, isPurchasable: true },
    { priceCents: 0, approvalStatus: "APPROVED", priceApprovedBy: "a" }
  ];
  for (const c of cases) {
    const p = publicCatalogueProduct({ ...base, unit: "kg", ...c } as Parameters<typeof publicCatalogueProduct>[0]);
    assert.equal(p.price, null);
    assert.equal(p.priceCents, null);
    assert.equal(p.isPurchasable, false);
    assert.equal(p.unitPriceDisplay, null);
    assert.equal(p.availabilityStatus, "UNKNOWN");
  }
  const snapshot = publicCatalogueProduct({ ...base, priceCents: 450, approvalStatus: "APPROVED", priceApprovedBy: "a", isPurchasable: true } as Parameters<typeof publicCatalogueProduct>[0], "asset-review");
  assert.equal(snapshot.price, null);
  assert.equal(snapshot.isPurchasable, false);
});

test("compare-at price needs explicit admin approval and a higher value; market prices are ignored", () => {
  const approved = { priceCents: 450, approvalStatus: "APPROVED", priceApprovedBy: "a", isPurchasable: true, compareAtPrice: 6 };
  const hidden = publicCatalogueProduct({ ...base, ...approved } as Parameters<typeof publicCatalogueProduct>[0]);
  assert.equal(hidden.compareAtPrice, null);
  const shown = publicCatalogueProduct({ ...base, ...approved, compareAtApproved: true } as Parameters<typeof publicCatalogueProduct>[0]);
  assert.equal(shown.compareAtPrice, 6);
  const lower = publicCatalogueProduct({ ...base, ...approved, compareAtApproved: true, compareAtPrice: 4 } as Parameters<typeof publicCatalogueProduct>[0]);
  assert.equal(lower.compareAtPrice, null);
});

test("catalogue search is case insensitive and combines category and bounded results", () => {
  const carrot = publicCatalogueProduct(base);
  const apple = publicCatalogueProduct({ ...base, id: "two", slug: "apples", name: "Apples", category: { id: "fruit", name: "Fruits", slug: "fruits" } });
  assert.deepEqual(filterCatalogue([carrot, apple], { q: "CARROT" }), [carrot]);
  assert.deepEqual(filterCatalogue([carrot, apple], { category: "fruits", q: "apple" }), [apple]);
  assert.deepEqual(filterCatalogue([carrot, apple], { category: "fruits", q: "carrot" }), []);
  assert.equal(filterCatalogue([carrot, apple], { limit: 1 })[0].name, "Apples");
});

test("staff edits remain visible and product descriptions are preserved", () => {
  const seeded = { ...base, slug: "blueberries-125g", name: "Australian Blueberries", description: "Sweet and antioxidant-rich local blueberries." };
  assert.equal(publicCatalogueProduct(seeded).name, "Blueberries");
  assert.equal(publicCatalogueProduct(seeded).description, "Sweet and antioxidant-rich local blueberries.");
  const edited = publicCatalogueProduct({ ...seeded, name: "Blueberry punnet", description: "Fresh local punnet." });
  assert.equal(edited.name, "Blueberry punnet");
  assert.equal(edited.description, "Fresh local punnet.");
});

test("reviewed snapshot provides categories and rejects Vercel production", async () => {
  const previousMode = process.env.CATALOGUE_DATA_SOURCE;
  const previousEnv = process.env.VERCEL_ENV;
  process.env.CATALOGUE_DATA_SOURCE = "reviewed-snapshot";
  try {
    delete process.env.VERCEL_ENV;
    const categories = await getCategories();
    assert.ok(categories.length >= 8);
    assert.ok(categories.some((c) => c.slug === "fruits"));
    assert.ok(categories.some((c) => c.slug === "vegetables"));
    process.env.VERCEL_ENV = "production";
    assert.throws(usesReviewedSnapshot, /cannot be published to production/);
  } finally {
    if (previousMode === undefined) delete process.env.CATALOGUE_DATA_SOURCE;
    else process.env.CATALOGUE_DATA_SOURCE = previousMode;
    if (previousEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousEnv;
  }
});

test("approved generic illustrations replace only known placeholders without changing product identity", () => {
  assert.equal(Object.keys(catalogueIllustrations).length, 12);
  for (const [slug, illustration] of Object.entries(catalogueIllustrations)) {
    const input = {...base, slug, imageUrl: PLACEHOLDER_IMAGE, imageAlt: "Photo coming soon"};
    const before = structuredClone(input);
    const product = publicCatalogueProduct(input);
    assert.equal(product.imageUrl, `/products/ai/${slug}-illustration.webp`);
    assert.equal(product.imageAlt, illustration.imageAlt);
    assert.match(product.imageAlt!, /Generic AI-generated/);
    assert.match(product.imageAlt!, /not actual packaging/);
    assert.equal(product.imageKind, "ai");
    assert.equal(product.id, input.id);
    assert.equal(product.slug, input.slug);
    assert.equal(product.name, input.name);
    assert.equal(product.priceCents, null);
    assert.equal(product.isPurchasable, false);
    assert.deepEqual(input, before);
    const candidate = catalogueCandidates.find(p => p.slug === slug);
    assert.ok(candidate, slug);
    assert.equal(candidate.imageUrl, product.imageUrl);
    assert.equal(candidate.imageAlt, product.imageAlt);
    assert.equal(candidate.imageKind, "ai-illustration");
    for (const imageUrl of ["/products/owner-photo.webp", "/products/ai/owner-illustration.webp"]) {
      const edited = publicCatalogueProduct({...input, imageUrl, imageAlt: "Owner supplied image"});
      assert.equal(edited.imageUrl, imageUrl);
      assert.equal(edited.imageAlt, "Owner supplied image");
    }
  }
});
test("unknown placeholders remain unchanged, including inherited object property names", () => {
  for (const slug of ["unreviewed-product", "toString", "__proto__"]) {
    const product = publicCatalogueProduct({...base, slug, imageUrl: PLACEHOLDER_IMAGE, imageAlt: "Pending"});
    assert.equal(product.imageUrl, PLACEHOLDER_IMAGE);
    assert.equal(product.imageAlt, "Pending");
    assert.equal(product.imageKind, "placeholder");
  }
});
