import assert from "node:assert/strict";
import test from "node:test";
import { CATALOGUE_PAGE_SIZE, MAX_CATALOGUE_PAGE, cataloguePageHref, cataloguePageNumbers, paginateCatalogue, parseCataloguePage } from "./catalogue-pagination";
import { buildProductsMetadata } from "../components/products/catalogue-seo";

test("catalogue page accepts bounded positive decimal integers only", () => {
  for (const value of [undefined, "", "0", "-2", "1.5", "1e2", "NaN", "Infinity", "2x"]) assert.equal(parseCataloguePage(value), 1, String(value));
  assert.equal(parseCataloguePage(" 002 "), 2);
  assert.equal(parseCataloguePage("999999999999999999999999"), MAX_CATALOGUE_PAGE);
});

test("pagination renders at most24 products and preserves every product across pages", () => {
  const all = Array.from({ length: 171 }, (_, index) => index);
  const pages = Array.from({ length: 8 }, (_, index) => paginateCatalogue(all, index + 1));
  assert.equal(CATALOGUE_PAGE_SIZE, 24);
  assert.deepEqual(pages.flatMap(page => page.items), all);
  assert.deepEqual(pages.map(page => page.items.length), [24, 24, 24, 24, 24, 24, 24, 3]);
  assert.deepEqual({ page: pages[1].page, start: pages[1].start, end: pages[1].end, total: pages[1].total, totalPages: pages[1].totalPages }, { page: 2, start: 25, end: 48, total: 171, totalPages: 8 });
});

test("out-of-range pages clamp to real bounds, including empty catalogues", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  assert.equal(paginateCatalogue(items, 999).page, 2);
  for (const value of [-1, 0, NaN, Infinity, 1.5]) assert.equal(paginateCatalogue(items, value).page, 1);
  assert.deepEqual(paginateCatalogue([], 99), { items: [], page: 1, totalPages: 1, total: 0, start: 0, end: 0 });
});

test("pager URLs preserve filters safely and omit page1", () => {
  assert.equal(cataloguePageHref({ page: 1 }), "/products");
  assert.equal(cataloguePageHref({ page: 2 }), "/products?page=2");
  const url = new URL(cataloguePageHref({ category: "fruits", q: "pear & apple", page: 3 }), "https://example.com");
  assert.equal(url.searchParams.get("category"), "fruits");
  assert.equal(url.searchParams.get("q"), "pear & apple");
  assert.equal(url.searchParams.get("page"), "3");
  assert.equal(cataloguePageHref({ category: "fruits", q: "pear", page: 1 }), "/products?category=fruits&q=pear");
});

test("non-search pages have page-specific canonical URLs; search stays noindex", () => {
  assert.deepEqual(buildProductsMetadata(undefined, "", 2).alternates, { canonical: "/products?page=2" });
  assert.deepEqual(buildProductsMetadata({ name: "Fruit", slug: "fruits" }, "", 3).alternates, { canonical: "/products?category=fruits&page=3" });
  assert.deepEqual(buildProductsMetadata(undefined, "banana", 2).alternates, { canonical: "/products" });
  assert.deepEqual(buildProductsMetadata({ name: "Fruit", slug: "fruits" }, "banana", 2).alternates, { canonical: "/products?category=fruits" });
  assert.deepEqual(buildProductsMetadata(undefined, "banana", 2).robots, { index: false, follow: true });
});


test("pager number links stay bounded and include first/current/last", () => {
  assert.deepEqual(cataloguePageNumbers(1, 1), [1]);
  assert.deepEqual(cataloguePageNumbers(1, 8), [1, 2, 8]);
  assert.deepEqual(cataloguePageNumbers(5, 1000), [1, 4, 5, 6, 1000]);
  assert.deepEqual(cataloguePageNumbers(8, 8), [1, 7, 8]);
});
