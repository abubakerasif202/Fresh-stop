import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";

/**
 * Stock reservations. Every stock mutation is a single conditional SQL
 * statement so concurrent transactions can never oversell or go negative.
 * Call reserve/commit/release inside a transaction (`db.$transaction`).
 */

export type ReservationItem = { productId: string; quantity: number };
export type ReservationEndStatus = "RELEASED" | "EXPIRED";
export type StockConflictReason = "INSUFFICIENT_STOCK" | "INVALID_QUANTITY" | "DUPLICATE_PRODUCT" | "PRICE_CHANGED";

export interface StockConflict {
  productId: string;
  reason: StockConflictReason;
}

/** Thrown by reserveStock so the surrounding transaction rolls back every partial reservation. */
export class StockConflictError extends Error {
  readonly conflicts: StockConflict[];
  constructor(conflicts: StockConflict[]) {
    super("Stock could not be reserved");
    this.name = "StockConflictError";
    this.conflicts = conflicts;
  }
}

export interface CommitResult {
  /** Reservations moved to COMMITTED by this call. */
  committed: ReservationItem[];
  /** Lapsed lines whose stock could not be re-claimed (oversold); stock is untouched for these. */
  shortfalls: ReservationItem[];
  /** True when nothing needed work (e.g. a repeated commit). */
  noop: boolean;
}

type Tx = Prisma.TransactionClient;
type Row = { productId: string; quantity: number };

function validateItems(items: ReservationItem[]): StockConflict[] {
  const conflicts: StockConflict[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) conflicts.push({ productId: item.productId, reason: "INVALID_QUANTITY" });
    if (seen.has(item.productId)) conflicts.push({ productId: item.productId, reason: "DUPLICATE_PRODUCT" });
    seen.add(item.productId);
  }
  return conflicts;
}

/**
 * Atomically reserves stock for every item or throws StockConflictError.
 * Products are processed in id order so concurrent orders cannot deadlock.
 */
export async function reserveStock(
  tx: Tx,
  orderId: string,
  items: ReservationItem[],
  ttlMinutes: number,
  now: Date = new Date()
): Promise<void> {
  const invalid = validateItems(items);
  if (invalid.length > 0) throw new StockConflictError(invalid);
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);
  const conflicts: StockConflict[] = [];
  for (const item of [...items].sort((a, b) => a.productId.localeCompare(b.productId))) {
    const updated = await tx.$executeRaw`
      UPDATE "Product"
      SET "updatedAt" = clock_timestamp(), "reservedQuantity" = "reservedQuantity" + ${item.quantity}
      WHERE "id" = ${item.productId}
        AND "isPublished" = true AND "isActive" = true AND "isPurchasable" = true
        AND "approvalStatus" = 'APPROVED' AND "stockVerified" = true
        AND "stockQuantity" IS NOT NULL
        AND "stockQuantity" - "reservedQuantity" >= ${item.quantity}`;
    if (updated === 0) {
      conflicts.push({ productId: item.productId, reason: "INSUFFICIENT_STOCK" });
      continue;
    }
    await tx.inventoryReservation.create({
      data: { orderId, productId: item.productId, quantity: item.quantity, status: "ACTIVE", expiresAt }
    });
  }
  if (conflicts.length > 0) throw new StockConflictError(conflicts);
}

async function commitActive(tx: Tx, orderId: string): Promise<{ committed: ReservationItem[]; shortfalls: ReservationItem[]; seen: number }> {
  const active = await tx.$queryRaw<Row[]>`
    UPDATE "InventoryReservation" SET "status" = 'COMMITTED', "updatedAt" = NOW()
    WHERE "orderId" = ${orderId} AND "status" = 'ACTIVE'
    RETURNING "productId", "quantity"`;
  const committed: ReservationItem[] = [];
  const shortfalls: ReservationItem[] = [];
  for (const row of active) {
    const moved = await tx.$executeRaw`
      UPDATE "Product"
      SET "updatedAt" = clock_timestamp(), "stockQuantity" = "stockQuantity" - ${row.quantity},
          "reservedQuantity" = GREATEST("reservedQuantity" - ${row.quantity}, 0)
      WHERE "id" = ${row.productId} AND "stockQuantity" IS NOT NULL AND "stockQuantity" >= ${row.quantity}`;
    const line = { productId: row.productId, quantity: row.quantity };
    if (moved === 0) {
      shortfalls.push(line);
      await tx.inventoryReservation.updateMany({ where: { orderId, productId: row.productId, status: "COMMITTED" }, data: { status: "RELEASED" } });
      await tx.$executeRaw`UPDATE "Product" SET "updatedAt" = clock_timestamp(), "reservedQuantity" = GREATEST("reservedQuantity" - ${row.quantity}, 0) WHERE "id" = ${row.productId}`;
    }
    else committed.push(line);
  }
  return { committed, shortfalls, seen: active.length };
}

async function recommitLapsed(tx: Tx, orderId: string): Promise<{ committed: ReservationItem[]; shortfalls: ReservationItem[]; seen: number }> {
  const lapsed = await tx.$queryRaw<Row[]>`
    SELECT "productId", "quantity" FROM "InventoryReservation"
    WHERE "orderId" = ${orderId} AND "status" IN ('EXPIRED', 'RELEASED')
    ORDER BY "productId" FOR UPDATE`;
  const committed: ReservationItem[] = [];
  const shortfalls: ReservationItem[] = [];
  for (const row of lapsed) {
    const claimed = await tx.$executeRaw`
      UPDATE "Product" SET "updatedAt" = clock_timestamp(), "stockQuantity" = "stockQuantity" - ${row.quantity}
      WHERE "id" = ${row.productId} AND "stockQuantity" IS NOT NULL
        AND "stockQuantity" - "reservedQuantity" >= ${row.quantity}`;
    const line = { productId: row.productId, quantity: row.quantity };
    if (claimed === 0) {
      shortfalls.push(line);
      continue;
    }
    await tx.inventoryReservation.updateMany({
      where: { orderId, productId: row.productId, status: { in: ["EXPIRED", "RELEASED"] } },
      data: { status: "COMMITTED" }
    });
    committed.push(line);
  }
  return { committed, shortfalls, seen: lapsed.length };
}

/**
 * Converts ACTIVE reservations to COMMITTED and decrements stock. Idempotent:
 * a second call finds nothing ACTIVE and changes nothing. A reservation that
 * already lapsed (payment arrived after expiry) is re-claimed only if stock
 * is still free; otherwise it is reported in `shortfalls` and stock is untouched.
 */
export async function commitReservation(tx: Tx, orderId: string): Promise<CommitResult> {
  const active = await commitActive(tx, orderId);
  const lapsed = await recommitLapsed(tx, orderId);
  return {
    committed: [...active.committed, ...lapsed.committed],
    shortfalls: [...active.shortfalls, ...lapsed.shortfalls],
    noop: active.seen === 0 && lapsed.seen === 0
  };
}

/**
 * Returns ACTIVE reservations to the pool. COMMITTED reservations are never
 * touched, so releasing after a commit is a no-op.
 */
export async function releaseReservation(tx: Tx, orderId: string, status: ReservationEndStatus): Promise<ReservationItem[]> {
  const released = await tx.$queryRaw<Row[]>`
    UPDATE "InventoryReservation" SET "status" = ${status}, "updatedAt" = NOW()
    WHERE "orderId" = ${orderId} AND "status" = 'ACTIVE'
    RETURNING "productId", "quantity"`;
  for (const row of released) {
    await tx.$executeRaw`
      UPDATE "Product" SET "updatedAt" = clock_timestamp(), "reservedQuantity" = GREATEST("reservedQuantity" - ${row.quantity}, 0)
      WHERE "id" = ${row.productId}`;
  }
  return released.map((row) => ({ productId: row.productId, quantity: row.quantity }));
}

/** Expires lapsed reservations (and their unpaid orders). Safe to run concurrently and repeatedly. */
export async function releaseExpiredReservations(now: Date = new Date(), client: PrismaClient = db): Promise<number> {
  const due = await client.inventoryReservation.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now } },
    select: { orderId: true },
    distinct: ["orderId"],
    take: 200
  });
  let expired = 0;
  for (const { orderId } of due) {
    await client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
      const released = await releaseReservation(tx, orderId, "EXPIRED");
      if (released.length === 0) return;
      expired += 1;
      await tx.order.updateMany({
        where: { id: orderId, paymentStatus: { in: ["PENDING", "FAILED"] }, orderStatus: "PENDING_PAYMENT" },
        data: { paymentStatus: "EXPIRED", orderStatus: "CANCELLED", cancelledAt: now }
      });
    });
  }
  return expired;
}
