import test from "node:test";
import assert from "node:assert/strict";
import { parsePricingCsv } from "./admin-pricing-import";

test("pricing CSV accepts exported columns, BOM, quoted cells and integer cents", () => {
  assert.deepEqual(parsePricingCsv('\uFEFFSlug,Product Name,Suggested Price AUD\r\napples,"Apples, red",4.50\r\npears,"Pear ""pack""",2\r\n'), [
    { slug: "apples", priceCents: 450 }, { slug: "pears", priceCents: 200 }
  ]);
});

test("pricing CSV rejects malformed input, duplicate products, invalid prices and formula cells", () => {
  for (const input of [
    "Slug,Suggested Price AUD\napples,4.50\napples,5",
    "Slug,Suggested Price AUD\napples,0",
    "Slug,Suggested Price AUD\napples,2.001",
    "Slug,Suggested Price AUD\napples,=1+2",
    "Slug,Suggested Price AUD\napples,501",
    'Slug,Suggested Price AUD\napples,"2',
    'Slug,Suggested Price AUD\napples,"2"bad',
    "Slug,Suggested Price AUD\napples,2,extra",
    "Slug,Approved Price AUD\napples,2",
    "Slug,Slug,Suggested Price AUD\napples,apples,2",
    "Slug,Suggested Price AUD\n=invalid,2",
    "Slug,Suggested Price AUD",
    "a".repeat(200_001),
    `Slug,Suggested Price AUD\n${Array.from({ length: 201 }, (_, i) => `apple-${i},2`).join("\n")}`
  ]) assert.throws(() => parsePricingCsv(input));
});
