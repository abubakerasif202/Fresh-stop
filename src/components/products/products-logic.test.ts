import test from "node:test";
import assert from "node:assert/strict";
import { catalogueCategories } from "@/data/catalogue-candidates";
import { PRIMARY_CATEGORY_SLUGS, splitCategories, productsHref } from "./category-order";
import { buildBreadcrumbJsonLd, buildItemListJsonLd, buildProductJsonLd, buildProductsMetadata, jsonLdString } from "./catalogue-seo";

test("primary tabs follow the required order", () => {
  const { primary } = splitCategories(catalogueCategories);
  assert.deepEqual(primary.map(t => t.slug), [...PRIMARY_CATEGORY_SLUGS]);
  assert.deepEqual(primary.map(t => t.label), ["Fruits", "Vegetables", "Leafy Greens", "Herbs", "Specialty Produce", "Pantry", "Frozen Foods", "Drinks"]);
});
test("every data category slug is reachable exactly once (tabs or more)", () => {
  const { primary, more } = splitCategories(catalogueCategories);
  const all = [...primary, ...more].map(t => t.slug).sort();
  assert.deepEqual(all, catalogueCategories.map(c => c.slug).sort());
  assert.ok(more.some(t => t.slug === "rice-grains") && more.some(t => t.slug === "condiments"));
});
test("unknown database categories fall into More", () => {
  const { more } = splitCategories([{ name: "Dairy", slug: "dairy" }, { name: "Fruit", slug: "fruits" }]);
  assert.deepEqual(more.map(t => t.slug), ["dairy"]);
});
test("category URLs are shareable and encoded", () => {
  assert.equal(productsHref(), "/products");
  assert.equal(productsHref("fruits", "bok choy & kale"), "/products?category=fruits&q=bok+choy+%26+kale");
});
test("category metadata is unique with a canonical; searches are noindex", () => {
  const a = buildProductsMetadata({ name: "Fruit", slug: "fruits" });
  const b = buildProductsMetadata({ name: "Drinks", slug: "drinks" });
  assert.notEqual(a.title, b.title);
  assert.notEqual(a.description, b.description);
  assert.deepEqual(a.alternates, { canonical: "/products?category=fruits" });
  assert.equal(buildProductsMetadata(undefined, "x").robots && (buildProductsMetadata(undefined, "x").robots as { index: boolean }).index, false);
});
test("JSON-LD carries no price or offers and escapes script-closing text", () => {
  const products = [{ slug: "bok-choy", name: "Bok choy & </script>", imageUrl: "/products/ai/bok-choy.webp", description: "d", category: { name: "Vegetables", slug: "vegetables" } }];
  const docs = [
    buildItemListJsonLd("https://example.com", "Veg", products),
    buildBreadcrumbJsonLd("https://example.com/", [{ name: "Catalogue", path: "/products" }]),
    buildProductJsonLd("https://example.com", products[0])
  ];
  for (const d of docs) {
    const s = jsonLdString(d);
    assert.doesNotMatch(s, /"offers"|"price|priceCurrency|availability/i);
    assert.ok(!s.includes("</script>"));
  }
  assert.equal(docs[2]["@type"], "Product");
  assert.equal((docs[1] as { itemListElement: { item: string }[] }).itemListElement[0].item, "https://example.com/products");
});
