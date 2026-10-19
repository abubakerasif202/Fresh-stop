import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route";

test("public API validates bounded filters before loading catalogue", async () => {
  for (const query of ["limit=0","limit=101","limit=no","q="+"a".repeat(101),"category="+"b".repeat(101)]) {
    assert.equal((await GET(new Request(`https://example.test/api/products?${query}`))).status,400);
  }
});
test("reviewed snapshot API returns public e-commerce fields and strips admin secrets", async () => {
  const previous = process.env.CATALOGUE_DATA_SOURCE;
  process.env.CATALOGUE_DATA_SOURCE = "reviewed-snapshot";
  try {
    const response = await GET(new Request("https://example.test/api/products?q=carrot"));
    assert.equal(response.status, 200);
    const products = await response.json();
    assert.ok(products.length > 0);
    for (const p of products) {
      assert.match(p.name, /carrot/i);
      // Bundled snapshot data is never priced: enquiry-only.
      assert.equal(p.price, null);
      assert.equal(p.priceCents, null);
      assert.equal(p.unitPriceDisplay, null);
      assert.equal(p.isPurchasable, false);

      // Internal admin fields must not leak
      for (const field of ["costPriceCents", "marginPercent", "adminNotes", "secret"]) {
        assert.equal(field in p, false, `Field ${field} must not leak`);
      }
    }
  } finally {
    if (previous === undefined) delete process.env.CATALOGUE_DATA_SOURCE;
    else process.env.CATALOGUE_DATA_SOURCE = previous;
  }
});
