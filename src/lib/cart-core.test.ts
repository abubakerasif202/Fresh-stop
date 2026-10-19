import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_LINE_QUANTITY,
  FALLBACK_IMAGE,
  addLine,
  applyRefresh,
  clampQuantity,
  estimatedSubtotalCents,
  itemCount,
  removeLine,
  removeLines,
  safeImageUrl,
  sanitizeLines,
  setLineQuantity,
  unavailableIds,
  type CartLine,
  type CartLineInput
} from "./cart-core";
import { CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY, parseCart, readCart, serializeCart, writeCart, type StorageLike } from "./cart-storage";
import { createCartStore } from "./cart-store";

const apple: CartLineInput = { productId: "p1", slug: "apple", name: "Apple", unit: "kg", imageUrl: "/products/apple.webp", imageAlt: null, priceCents: 399 };
const pear: CartLineInput = { productId: "p2", slug: "pear", name: "Pear", unit: "each", imageUrl: "/products/pear.webp", imageAlt: "A pear", priceCents: 150 };

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe("cart reducer functions", () => {
  it("adds a new line and merges repeat adds into one line", () => {
    const once = addLine([], apple);
    const twice = addLine(once, apple, 2);
    assert.equal(twice.length, 1);
    assert.equal(twice[0].quantity, 3);
  });

  it("does not mutate its input", () => {
    const start: CartLine[] = addLine([], apple);
    const frozen = Object.freeze(start.map((l) => Object.freeze({ ...l })));
    const next = addLine(frozen, pear);
    assert.equal(frozen.length, 1);
    assert.equal(next.length, 2);
  });

  it("clamps quantities to 1..99 and ignores garbage", () => {
    assert.equal(clampQuantity(0), 1);
    assert.equal(clampQuantity(-5), 1);
    assert.equal(clampQuantity(1000), MAX_LINE_QUANTITY);
    assert.equal(clampQuantity(2.9), 2);
    assert.equal(clampQuantity(Number.NaN), 1);
    assert.equal(clampQuantity("7"), 7);
    assert.equal(addLine(addLine([], apple, 98), apple, 50)[0].quantity, MAX_LINE_QUANTITY);
  });

  it("setLineQuantity updates, clamps and removes below 1", () => {
    const lines = addLine(addLine([], apple), pear);
    assert.equal(setLineQuantity(lines, "p1", 5)[0].quantity, 5);
    assert.equal(setLineQuantity(lines, "p1", 500)[0].quantity, MAX_LINE_QUANTITY);
    assert.deepEqual(setLineQuantity(lines, "p1", 0).map((l) => l.productId), ["p2"]);
  });

  it("removes lines and counts items and estimated subtotal in integer cents", () => {
    const lines = addLine(addLine([], apple, 2), pear, 3);
    assert.equal(itemCount(lines), 5);
    assert.equal(estimatedSubtotalCents(lines), 2 * 399 + 3 * 150);
    assert.deepEqual(removeLine(lines, "p1").map((l) => l.productId), ["p2"]);
  });

  it("rejects a line whose price is not a positive integer number of cents", () => {
    assert.deepEqual(addLine([], { ...apple, priceCents: 3.99 }), []);
    assert.deepEqual(addLine([], { ...apple, priceCents: 0 }), []);
    assert.deepEqual(addLine([], { ...apple, priceCents: Number.NaN }), []);
  });
});

describe("cart sanitising", () => {
  it("only allows same-origin image paths", () => {
    assert.equal(safeImageUrl("/products/a.webp"), "/products/a.webp");
    assert.equal(safeImageUrl("https://evil.example/x.png"), FALLBACK_IMAGE);
    assert.equal(safeImageUrl("//evil.example/x.png"), FALLBACK_IMAGE);
    assert.equal(safeImageUrl("/../secret"), FALLBACK_IMAGE);
    assert.equal(safeImageUrl(42), FALLBACK_IMAGE);
  });

  it("drops invalid and duplicate stored lines", () => {
    const out = sanitizeLines([{ ...apple, quantity: 2 }, { ...apple, quantity: 9 }, null, "x", { productId: "z" }, { ...pear, quantity: 500 }]);
    assert.deepEqual(out.map((l) => [l.productId, l.quantity]), [["p1", 2], ["p2", MAX_LINE_QUANTITY]]);
  });
});

describe("cart storage", () => {
  it("round-trips through the versioned payload", () => {
    const lines = addLine(addLine([], apple, 2), pear);
    assert.deepEqual(parseCart(serializeCart(lines)), lines);
  });

  it("discards corrupt, wrong-shape and future-version data", () => {
    assert.deepEqual(parseCart("{not json"), []);
    assert.deepEqual(parseCart(null), []);
    assert.deepEqual(parseCart("[1,2,3]"), []);
    assert.deepEqual(parseCart(JSON.stringify({ version: 99, lines: [{ ...apple, quantity: 1 }] })), []);
    assert.deepEqual(parseCart(JSON.stringify({ version: 2, lines: "nope" })), []);
  });

  it("migrates the legacy v1 array, keeping only the integer price", () => {
    const legacy = JSON.stringify([{ ...apple, price: 3.99, taxCategory: "GST_FREE", quantity: 2 }]);
    const storage = memoryStorage({ [LEGACY_CART_STORAGE_KEY]: legacy });
    const lines = readCart(storage);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].priceCents, 399);
    assert.equal("price" in lines[0], false);
    assert.equal(writeCart(storage, lines), true);
    assert.equal(storage.data.has(LEGACY_CART_STORAGE_KEY), false);
    assert.ok(storage.data.has(CART_STORAGE_KEY));
  });

  it("never throws when storage is unavailable or throwing", () => {
    const throwing: StorageLike = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("quota"); },
      removeItem: () => { throw new Error("blocked"); }
    };
    assert.deepEqual(readCart(throwing), []);
    assert.equal(writeCart(throwing, []), false);
    assert.deepEqual(readCart(null), []);
    assert.equal(writeCart(null, []), false);
  });
});

describe("cart store", () => {
  it("serves an empty server snapshot and loads the stored cart on the client", () => {
    const storage = memoryStorage({ [CART_STORAGE_KEY]: serializeCart(addLine([], apple, 2)) });
    const store = createCartStore(() => storage);
    assert.equal(store.getServerSnapshot().length, 0);
    assert.equal(store.getSnapshot()[0].quantity, 2);
    assert.equal(store.getSnapshot(), store.getSnapshot(), "snapshot must be referentially stable");
  });

  it("persists updates, notifies listeners and survives failed writes in memory", () => {
    const storage = memoryStorage();
    const store = createCartStore(() => storage);
    let calls = 0;
    const off = store.subscribe(() => { calls += 1; });
    store.update((l) => addLine(l, apple));
    assert.equal(calls, 1);
    assert.equal(parseCart(storage.data.get(CART_STORAGE_KEY) ?? null).length, 1);
    off();
    store.update((l) => addLine(l, pear));
    assert.equal(calls, 1);

    const broken = createCartStore(() => ({ getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => {} }));
    broken.update((l) => addLine(l, apple));
    assert.equal(broken.getSnapshot().length, 1);
  });

  it("syncs another tab's change from the storage event and ignores unrelated keys", () => {
    const storage = memoryStorage();
    const store = createCartStore(() => storage);
    assert.equal(store.getSnapshot().length, 0);
    let notified = 0;
    store.subscribe(() => { notified += 1; });
    storage.setItem(CART_STORAGE_KEY, serializeCart(addLine([], pear, 4)));
    store.handleStorageEvent("something_else");
    assert.equal(notified, 0);
    store.handleStorageEvent(CART_STORAGE_KEY);
    assert.equal(notified, 1);
    assert.equal(store.getSnapshot()[0].quantity, 4);
    storage.removeItem(CART_STORAGE_KEY);
    store.handleStorageEvent(null);
    assert.equal(store.getSnapshot().length, 0);
  });
});

describe("refresh merge", () => {
  const lines = addLine(addLine(addLine([], apple, 2), pear), { ...apple, productId: "p3", slug: "plum", name: "Plum" });

  it("updates changed prices and flags them", () => {
    const out = applyRefresh(lines, [
      { productId: "p1", purchasable: true, priceCents: 450, reason: null },
      { productId: "p2", purchasable: true, priceCents: 150, reason: null },
      { productId: "p3", purchasable: true, priceCents: 399, reason: null }
    ]);
    assert.equal(out.lines[0].priceCents, 450);
    assert.equal(out.lines[0].quantity, 2);
    assert.deepEqual(out.statuses.p1, { kind: "price-changed", fromCents: 399, toCents: 450 });
    assert.equal(out.statuses.p2, undefined);
  });

  it("flags unpurchasable and missing products as unavailable without dropping them", () => {
    const out = applyRefresh(lines, [
      { productId: "p1", purchasable: false, priceCents: null, reason: "OUT_OF_STOCK" },
      { productId: "p2", purchasable: true, priceCents: 150, reason: null }
    ]);
    assert.equal(out.lines.length, 3);
    assert.deepEqual(out.statuses.p1, { kind: "unavailable", reason: "OUT_OF_STOCK" });
    assert.deepEqual(out.statuses.p3, { kind: "unavailable", reason: "NOT_FOUND" });
    assert.deepEqual(unavailableIds(out.statuses).sort(), ["p1", "p3"]);
    assert.deepEqual(removeLines(out.lines, unavailableIds(out.statuses)).map((l) => l.productId), ["p2"]);
  });

  it("treats a purchasable result with a null price as unavailable (fail closed)", () => {
    const out = applyRefresh(lines, [{ productId: "p1", purchasable: true, priceCents: null, reason: null }]);
    assert.equal(out.statuses.p1.kind, "unavailable");
  });
});
