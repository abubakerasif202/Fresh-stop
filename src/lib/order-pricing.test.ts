import test from "node:test";
import assert from "node:assert/strict";
import { validateAndPriceOrder } from "./order-pricing";

test("order-pricing validates and prices cart items strictly server-side", async () => {
  // Empty items test
  const emptyRes = await validateAndPriceOrder([], "2216");
  assert.equal(emptyRes.ok, false);
  if (!emptyRes.ok) {
    assert.match(emptyRes.error, /empty/i);
  }

  // Ineligible postcode test
  const ineligibleRes = await validateAndPriceOrder([{ slug: "cavendish-bananas-1kg", quantity: 20 }], "3000");
  assert.equal(ineligibleRes.ok, false);
  if (!ineligibleRes.ok) {
    assert.match(ineligibleRes.error, /outside our current local fresh delivery zones/i);
  }

  // Invalid quantity test
  const invalidQtyRes = await validateAndPriceOrder([{ slug: "cavendish-bananas-1kg", quantity: -2 }], "2216");
  assert.equal(invalidQtyRes.ok, false);
  if (!invalidQtyRes.ok) {
    assert.match(invalidQtyRes.error, /invalid quantity/i);
  }

  // Below minimum spend ($50.00) test
  const belowMinRes = await validateAndPriceOrder([{ slug: "cavendish-bananas-1kg", quantity: 1 }], "2216");
  assert.equal(belowMinRes.ok, false);
  if (!belowMinRes.ok) {
    assert.match(belowMinRes.error, /minimum order amount is \$50\.00/i);
  }
});

test("order-pricing enforces server price authority and ignores client price tampering", async () => {
  // Client attempts to pass a tampered price
  const clientPayload = [
    {
      slug: "cavendish-bananas-1kg",
      quantity: 15,
      price: 0.01,
      priceCents: 1
    }
  ];

  const result = await validateAndPriceOrder(clientPayload, "2216");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].slug, "cavendish-bananas-1kg");
    assert.ok(result.items[0].priceCents > 100, "Price cents must be genuine catalog price, not $0.01");
    assert.equal(result.items[0].totalCents, result.items[0].priceCents * 15);
    assert.equal(result.subtotalCents, result.items[0].totalCents);
  }
});

test("order-pricing accurately computes Australian GST (GST-free vs taxable goods)", async () => {
  // Fresh produce: GST-free
  // Parle-G biscuits / snack: taxable (10% GST included, which is 1/11th of retail price)
  const items = [
    { slug: "cavendish-bananas-1kg", quantity: 15 }, // GST-free produce (~$59.85)
    { slug: "parle-g-biscuits", quantity: 8 }        // Taxable confectionery/biscuit
  ];

  const result = await validateAndPriceOrder(items, "2216");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.subtotalCents >= 5000, "Subtotal must exceed $50 minimum");

    const bananaItem = result.items.find((i) => i.slug === "cavendish-bananas-1kg");
    assert.ok(bananaItem);
    assert.equal(bananaItem.taxCategory, "GST_FREE");
    assert.equal(bananaItem.taxCents, 0);

    const parleGItem = result.items.find((i) => i.slug === "parle-g-biscuits");
    assert.ok(parleGItem);
    assert.equal(parleGItem.taxCategory, "TAXABLE_10");
    assert.ok(parleGItem.taxCents > 0);
    // GST in Australia is 1/11th of tax-inclusive retail price
    const expectedGst = Math.round(parleGItem.totalCents / 11);
    assert.equal(parleGItem.taxCents, expectedGst);

    // Total order GST must equal the sum of item GSTs
    assert.equal(result.gstTotalCents, parleGItem.taxCents);
  }
});

test("order-pricing applies delivery fees and waives them at $150 threshold", async () => {
  // Order under $150: subtotal ~$60
  const smallOrder = await validateAndPriceOrder(
    [{ slug: "cavendish-bananas-1kg", quantity: 15 }],
    "2216"
  );
  assert.equal(smallOrder.ok, true);
  if (smallOrder.ok && smallOrder.subtotalDollars < 150) {
    assert.equal(smallOrder.deliveryFeeCents, 999);
    assert.equal(smallOrder.totalCents, smallOrder.subtotalCents + 999);
  }

  // Order over $150: subtotal >= $150
  const largeOrder = await validateAndPriceOrder(
    [{ slug: "cavendish-bananas-1kg", quantity: 45 }],
    "2216"
  );
  assert.equal(largeOrder.ok, true);
  if (largeOrder.ok) {
    assert.ok(largeOrder.subtotalDollars >= 150);
    assert.equal(largeOrder.deliveryFeeCents, 0);
    assert.equal(largeOrder.deliveryFeeDollars, 0);
    assert.equal(largeOrder.totalCents, largeOrder.subtotalCents);
  }
});
