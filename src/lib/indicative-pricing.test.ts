import test from "node:test";
import assert from "node:assert/strict";
import registry from "../data/indicative-prices.json";
import baseline from "../data/catalogue-baseline.json";
import { catalogueCandidates } from "../data/catalogue-candidates";

test("indicative registry covers the complete catalogue with bounded integer AUD cents and explicit units", () => {
  const slugs = [...new Set([...baseline.products, ...catalogueCandidates].map(product => product.slug))].sort();
  assert.equal(slugs.length, 172);
  assert.deepEqual(Object.keys(registry).sort(), slugs);
  for (const [slug, row] of Object.entries(registry)) {
    assert.ok(Number.isSafeInteger(row.priceCents) && row.priceCents > 0 && row.priceCents <= 1_000_000, slug);
    assert.ok(row.unit.trim().length > 0 && Number.isFinite(row.packageQuantity) && row.packageQuantity > 0, slug);
    for (const field of ["costPrice", "compareAtPrice", "stockQuantity", "stockVerified", "approvalStatus", "priceApprovedBy"]) {
      assert.equal(field in row, false, `${slug}: demo data must not contain ${field}`);
    }
  }
});

test("retailer observations have dated source links while estimates remain explicitly labelled", () => {
  const rows = Object.values(registry) as Array<{ basis: string; notes: string; sourceUrl?: string; observedAt?: string }>;
  for (const row of rows) {
    assert.ok(row.notes.trim());
    if (row.basis === "observed") {
      assert.equal(new URL(row.sourceUrl ?? "").protocol, "https:");
      assert.match(row.observedAt ?? "", /^\d{4}-\d{2}-\d{2}$/);
    } else {
      assert.equal(row.basis, "estimated");
      assert.match(row.notes, /estimate/i);
    }
  }
});
