import test from "node:test";
import assert from "node:assert/strict";
import { cataloguePrice, sortCatalogue } from "./catalogue";

test("catalogue price uses the same positive special-price rule as checkout", () => {
  assert.equal(cataloguePrice({ price: 5, isSpecial: true, specialPrice: 3 }), 3);
  assert.equal(cataloguePrice({ price: 5, isSpecial: true, specialPrice: -1 }), 5);
  assert.equal(cataloguePrice({ price: 5, isSpecial: false, specialPrice: 3 }), 5);
});

test("price sorting uses the displayed special price without mutating catalogue order", () => {
  const products = [{ name: "Apples", price: 5 }, { name: "Bananas", price: 8, isSpecial: true, specialPrice: 2 }];
  assert.deepEqual(sortCatalogue(products, "price-asc").map((p) => p.name), ["Bananas", "Apples"]);
  assert.deepEqual(sortCatalogue(products, "price-desc").map((p) => p.name), ["Apples", "Bananas"]);
  assert.deepEqual(products.map((p) => p.name), ["Apples", "Bananas"]);
  assert.deepEqual(sortCatalogue(products, "unknown"), products);
});
