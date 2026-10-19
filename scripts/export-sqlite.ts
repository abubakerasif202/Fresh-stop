/**
 * Exports every table from the local SQLite database (prisma/fresh-stop.db) to
 * JSON so it can be imported into Postgres with scripts/import-data.ts.
 * Run BEFORE switching the Prisma datasource provider:
 *   npx tsx scripts/export-sqlite.ts
 */
import { PrismaClient } from "@prisma/client";
import { assertSafeDatabaseTarget } from "./db-guard.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

async function main() {
  assertSafeDatabaseTarget({ mode: "read", label: "export-sqlite" });
  const db = new PrismaClient();
  const data = {
    exportedAt: new Date().toISOString(),
    storeBranches: await db.storeBranch.findMany(),
    categories: await db.category.findMany(),
    products: await db.product.findMany(),
    branchInventory: await db.branchInventory.findMany(),
    deliveryZones: await db.deliveryZone.findMany(),
    orders: await db.order.findMany()
  };
  mkdirSync("prisma/export", { recursive: true });
  writeFileSync("prisma/export/sqlite-export.json", JSON.stringify(data, null, 2));
  console.log(
    Object.fromEntries(Object.entries(data).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, (v as unknown[]).length]))
  );
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
