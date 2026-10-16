import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route";

test("public API validates bounded filters before loading catalogue", async () => {
  for (const query of ["limit=0","limit=101","limit=no","q="+"a".repeat(101),"category="+"b".repeat(101)]) {
    assert.equal((await GET(new Request(`https://example.test/api/products?${query}`))).status,400);
  }
});
test("reviewed snapshot API ignores historical shopping filters and returns public fields", async () => {
  const previous = process.env.CATALOGUE_DATA_SOURCE;
  process.env.CATALOGUE_DATA_SOURCE = "reviewed-snapshot";
  try {
    const response = await GET(new Request("https://example.test/api/products?q=carrot&branch=unknown&special=true"));
    assert.equal(response.status,200);
    const products = await response.json();
    assert.ok(products.length > 0);
    for (const p of products) {
      assert.match(p.name,/carrot/i);
      for (const field of ["price","unit","compareAtPrice","specialPrice","isSpecial","inventory","isPublished"]) assert.equal(field in p,false,field);
    }
  } finally {
    if (previous === undefined) delete process.env.CATALOGUE_DATA_SOURCE;
    else process.env.CATALOGUE_DATA_SOURCE = previous;
  }
});
