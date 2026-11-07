import "./testing/local-db-env";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { db } from "./db";
import {
  StockConflictError,
  commitReservation,
  releaseExpiredReservations,
  releaseReservation,
  reserveStock
} from "./inventory";
import { cleanupTestData, createTestCategory, createTestOrder, createTestProduct } from "./testing/db-fixtures";

const orderIds: string[] = [];
const productIds: string[] = [];
let categoryId = "";

before(async () => {
  categoryId = (await createTestCategory(db)).id;
});

after(async () => {
  await cleanupTestData(db, { orderIds, productIds, categoryIds: [categoryId] });
  await db.$disconnect();
});

async function newProduct(stock: number | null, extra: Record<string, unknown> = {}) {
  const product = await createTestProduct(db, categoryId, { stockQuantity: stock, ...extra });
  productIds.push(product.id);
  return product;
}

async function newOrder() {
  const order = await createTestOrder(db);
  orderIds.push(order.id);
  return order;
}

async function reload(productId: string) {
  return db.product.findUniqueOrThrow({ where: { id: productId } });
}

test("a product newly changed to backorder cannot reserve without explicit acknowledgement", async () => {
  const product = await newProduct(5);
  const order = await newOrder();
  await db.product.update({ where: { id: product.id }, data: { availabilityStatus: "BACKORDER" } });
  await assert.rejects(db.$transaction((tx) => reserveStock(tx, order.id, [{ productId: product.id, quantity: 2 }], 30)),
    (error: unknown) => error instanceof StockConflictError && error.conflicts[0]?.reason === "BACKORDER_ACK_REQUIRED");
  assert.equal(await db.inventoryReservation.count({ where: { orderId: order.id } }), 0);
  await db.$transaction((tx) => reserveStock(tx, order.id, [{ productId: product.id, quantity: 2, backorderAcknowledged: true }], 30));
  await db.$transaction((tx) => commitReservation(tx, order.id));
  await db.$transaction((tx) => commitReservation(tx, order.id));
  assert.equal((await reload(product.id)).stockQuantity, 5);
  assert.equal((await reload(product.id)).reservedQuantity, 0);
  const reservation = await db.inventoryReservation.findFirstOrThrow({ where: { orderId: order.id } });
  assert.equal(reservation.isBackorder, true);
  assert.equal(reservation.status, "COMMITTED");
});

test("20 parallel reservations of 1 unit against stock 5 succeed exactly 5 times and never oversell", async () => {
  const product = await newProduct(5);
  const orders = await Promise.all(Array.from({ length: 20 }, () => newOrder()));
  const results = await Promise.all(
    orders.map((order) =>
      db
        .$transaction((tx) => reserveStock(tx, order.id, [{ productId: product.id, quantity: 1 }], 30))
        .then(() => "ok" as const)
        .catch((error: unknown) => (error instanceof StockConflictError ? ("conflict" as const) : Promise.reject(error)))
    )
  );
  assert.equal(results.filter((r) => r === "ok").length, 5);
  assert.equal(results.filter((r) => r === "conflict").length, 15);
  const after = await reload(product.id);
  assert.equal(after.reservedQuantity, 5);
  assert.equal(after.stockQuantity, 5);
  assert.equal(await db.inventoryReservation.count({ where: { productId: product.id, status: "ACTIVE" } }), 5);
});

test("a multi-line reservation that fails on one line rolls back every line", async () => {
  const plenty = await newProduct(10);
  const scarce = await newProduct(1);
  const order = await newOrder();
  await assert.rejects(
    db.$transaction((tx) =>
      reserveStock(tx, order.id, [{ productId: plenty.id, quantity: 3 }, { productId: scarce.id, quantity: 2 }], 30)
    ),
    (error: unknown) => error instanceof StockConflictError && error.conflicts[0].productId === scarce.id
  );
  assert.equal((await reload(plenty.id)).reservedQuantity, 0);
  assert.equal(await db.inventoryReservation.count({ where: { orderId: order.id } }), 0);
});

test("reservation is refused for unverified, unknown-stock and unapproved products", async () => {
  const cases = [
    await newProduct(10, { stockVerified: false }),
    await newProduct(null),
    await newProduct(10, { approvalStatus: "PENDING" }),
    await newProduct(10, { isPurchasable: false })
  ];
  for (const product of cases) {
    const order = await newOrder();
    await assert.rejects(
      db.$transaction((tx) => reserveStock(tx, order.id, [{ productId: product.id, quantity: 1 }], 30)),
      StockConflictError
    );
    assert.equal((await reload(product.id)).reservedQuantity, 0);
  }
});

test("invalid and duplicate quantities are rejected before touching stock", async () => {
  const product = await newProduct(10);
  const order = await newOrder();
  await assert.rejects(
    db.$transaction((tx) => reserveStock(tx, order.id, [{ productId: product.id, quantity: 0 }], 30)),
    StockConflictError
  );
  await assert.rejects(
    db.$transaction((tx) =>
      reserveStock(tx, order.id, [{ productId: product.id, quantity: 1 }, { productId: product.id, quantity: 1 }], 30)
    ),
    StockConflictError
  );
  assert.equal((await reload(product.id)).reservedQuantity, 0);
});

test("commit moves stockQuantity and reservedQuantity down, and a second commit is a no-op", async () => {
  const product = await newProduct(10);
  const order = await newOrder();
  await db.$transaction((tx) => reserveStock(tx, order.id, [{ productId: product.id, quantity: 4 }], 30));
  assert.equal((await reload(product.id)).reservedQuantity, 4);

  const first = await db.$transaction((tx) => commitReservation(tx, order.id));
  assert.deepEqual(first.committed, [{ productId: product.id, quantity: 4 }]);
  assert.equal(first.noop, false);
  let current = await reload(product.id);
  assert.equal(current.stockQuantity, 6);
  assert.equal(current.reservedQuantity, 0);

  const second = await db.$transaction((tx) => commitReservation(tx, order.id));
  assert.equal(second.noop, true);
  assert.deepEqual(second.committed, []);
  current = await reload(product.id);
  assert.equal(current.stockQuantity, 6);
  assert.equal(current.reservedQuantity, 0);
});

test("concurrent double commit decrements stock exactly once", async () => {
  const product = await newProduct(10);
  const order = await newOrder();
  await db.$transaction((tx) => reserveStock(tx, order.id, [{ productId: product.id, quantity: 3 }], 30));
  await Promise.all([
    db.$transaction((tx) => commitReservation(tx, order.id)),
    db.$transaction((tx) => commitReservation(tx, order.id))
  ]);
  const current = await reload(product.id);
  assert.equal(current.stockQuantity, 7);
  assert.equal(current.reservedQuantity, 0);
});

test("release returns reserved stock; release after commit is a no-op", async () => {
  const product = await newProduct(10);
  const releasedOrder = await newOrder();
  await db.$transaction((tx) => reserveStock(tx, releasedOrder.id, [{ productId: product.id, quantity: 2 }], 30));
  const released = await db.$transaction((tx) => releaseReservation(tx, releasedOrder.id, "RELEASED"));
  assert.equal(released.length, 1);
  assert.equal((await reload(product.id)).reservedQuantity, 0);
  assert.equal((await db.$transaction((tx) => releaseReservation(tx, releasedOrder.id, "RELEASED"))).length, 0);

  const committedOrder = await newOrder();
  await db.$transaction((tx) => reserveStock(tx, committedOrder.id, [{ productId: product.id, quantity: 3 }], 30));
  await db.$transaction((tx) => commitReservation(tx, committedOrder.id));
  const afterCommit = await db.$transaction((tx) => releaseReservation(tx, committedOrder.id, "EXPIRED"));
  assert.deepEqual(afterCommit, []);
  const current = await reload(product.id);
  assert.equal(current.stockQuantity, 7);
  assert.equal(current.reservedQuantity, 0);
  const reservation = await db.inventoryReservation.findFirstOrThrow({ where: { orderId: committedOrder.id } });
  assert.equal(reservation.status, "COMMITTED");
});

test("releaseExpiredReservations frees only lapsed reservations and expires their unpaid orders", async () => {
  const product = await newProduct(10);
  const lapsed = await newOrder();
  const live = await newOrder();
  const now = new Date();
  await db.$transaction((tx) => reserveStock(tx, lapsed.id, [{ productId: product.id, quantity: 2 }], 30, new Date(now.getTime() - 60 * 60_000)));
  await db.$transaction((tx) => reserveStock(tx, live.id, [{ productId: product.id, quantity: 3 }], 30, now));
  assert.equal((await reload(product.id)).reservedQuantity, 5);

  // Other test processes may sweep concurrently, so assert on resulting state, not on this call's count.
  await releaseExpiredReservations(now);
  assert.equal((await reload(product.id)).reservedQuantity, 3);
  assert.equal((await db.inventoryReservation.findFirstOrThrow({ where: { orderId: lapsed.id } })).status, "EXPIRED");
  assert.equal((await db.inventoryReservation.findFirstOrThrow({ where: { orderId: live.id } })).status, "ACTIVE");
  const lapsedOrder = await db.order.findUniqueOrThrow({ where: { id: lapsed.id } });
  assert.equal(lapsedOrder.paymentStatus, "EXPIRED");
  assert.equal(lapsedOrder.orderStatus, "CANCELLED");
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: live.id } })).paymentStatus, "PENDING");

  await releaseExpiredReservations(now);
  assert.equal((await reload(product.id)).reservedQuantity, 3, "second sweep must not double-release");
});

test("payment arriving after expiry re-claims stock when free and reports a shortfall when not", async () => {
  const product = await newProduct(3);
  const order = await newOrder();
  const past = new Date(Date.now() - 2 * 60 * 60_000);
  await db.$transaction((tx) => reserveStock(tx, order.id, [{ productId: product.id, quantity: 2 }], 30, past));
  await releaseExpiredReservations(new Date());
  const recovered = await db.$transaction((tx) => commitReservation(tx, order.id));
  assert.deepEqual(recovered.committed, [{ productId: product.id, quantity: 2 }]);
  assert.equal((await reload(product.id)).stockQuantity, 1);

  const lateOrder = await newOrder();
  await db.$transaction((tx) => reserveStock(tx, lateOrder.id, [{ productId: product.id, quantity: 1 }], 30, past));
  await releaseExpiredReservations(new Date());
  const other = await newOrder();
  await db.$transaction((tx) => reserveStock(tx, other.id, [{ productId: product.id, quantity: 1 }], 30));
  const shortfall = await db.$transaction((tx) => commitReservation(tx, lateOrder.id));
  assert.deepEqual(shortfall.shortfalls, [{ productId: product.id, quantity: 1 }]);
  const current = await reload(product.id);
  assert.ok((current.stockQuantity ?? 0) >= 0, "stock must never go negative");
});
