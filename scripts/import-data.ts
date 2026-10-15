/**
 * Imports prisma/export/sqlite-export.json into the Postgres database in
 * DATABASE_URL. Idempotent: existing rows (matched by primary key) are skipped,
 * so it is safe to re-run. IDs are preserved.
 *
 *   npx tsx scripts/import-data.ts              # catalogue + config only
 *   npx tsx scripts/import-data.ts --with-orders  # also import orders
 *
 * Orders are skipped by default: the local SQLite orders are test fixtures.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

interface Row { [key: string]: unknown }
interface ExportFile {
  storeBranches: Row[];
  categories: Row[];
  products: Row[];
  branchInventory: Row[];
  deliveryZones: Row[];
  orders: Row[];
}

const toDates = (rows: Row[]): Row[] =>
  rows.map((r) => {
    const out: Row = { ...r };
    for (const key of ["createdAt", "updatedAt"]) {
      if (typeof out[key] === "string") out[key] = new Date(out[key] as string);
    }
    return out;
  });

async function main() {
  const withOrders = process.argv.includes("--with-orders");
  const data = JSON.parse(readFileSync("prisma/export/sqlite-export.json", "utf8")) as ExportFile;
  const db = new PrismaClient();

  const result: Record<string, number> = {};
  result.storeBranches = (await db.storeBranch.createMany({ data: toDates(data.storeBranches) as never, skipDuplicates: true })).count;
  result.categories = (await db.category.createMany({ data: toDates(data.categories) as never, skipDuplicates: true })).count;
  result.products = (await db.product.createMany({ data: toDates(data.products) as never, skipDuplicates: true })).count;
  result.branchInventory = (await db.branchInventory.createMany({ data: toDates(data.branchInventory) as never, skipDuplicates: true })).count;
  result.deliveryZones = (await db.deliveryZone.createMany({ data: toDates(data.deliveryZones) as never, skipDuplicates: true })).count;
  if (withOrders) {
    result.orders = (await db.order.createMany({ data: toDates(data.orders) as never, skipDuplicates: true })).count;
  }

  const counts = {
    storeBranches: await db.storeBranch.count(),
    categories: await db.category.count(),
    products: await db.product.count(),
    branchInventory: await db.branchInventory.count(),
    deliveryZones: await db.deliveryZone.count(),
    orders: await db.order.count()
  };
  console.log("inserted:", result);
  console.log("table totals:", counts);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
