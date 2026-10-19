#!/usr/bin/env node
// READ-ONLY reconciliation report: classifies rows left behind by unverified commerce data
// (fabricated stock, auto-approved prices, fabricated cost price, unapproved delivery config).
// Runs inside a READ ONLY transaction; it cannot modify anything.
//
//   DATABASE_URL=... node scripts/db-reconcile-report.mjs [--md]
//
// Remote databases need ALLOW_REMOTE_DB_READ=yes-i-approved (see db-guard.mjs).
import { PrismaClient } from "@prisma/client";
import { assertSafeDatabaseTarget, formatIdentity } from "./db-guard.mjs";

const SAMPLE_LIMIT = 10;
const FABRICATED_STOCK_VALUES = [100, 150];

async function columnSet(tx) {
  const rows = await tx.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`;
  return new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));
}

/** Each check = [key, description, SQL WHERE fragment over "Product"|"DeliveryZone"|"Order", table]. */
function buildChecks(cols) {
  const verified = cols.has("Product.stockVerified") ? `"stockVerified"` : "false";
  const approver = cols.has("Product.priceApprovedBy") ? `"priceApprovedBy"` : "NULL";
  const compareOk = cols.has("Product.compareAtApproved") ? `"compareAtApproved"` : "false";
  const stockList = FABRICATED_STOCK_VALUES.join(",");
  const checks = [
    ["fabricatedStock", `stockQuantity in (${stockList}) and not stockVerified`, "Product", `"stockQuantity" IN (${stockList}) AND NOT ${verified}`],
    ["autoApprovedPrices", "approvalStatus APPROVED with no priceApprovedBy", "Product", `"approvalStatus" = 'APPROVED' AND ${approver} IS NULL`],
    ["costPricePopulated", "costPrice present (never to be used)", "Product", `"costPrice" IS NOT NULL`],
    ["costPriceNear65pct", "costPrice within 3% of 65% of price", "Product", `"costPrice" IS NOT NULL AND "price" > 0 AND abs("costPrice" / "price" - 0.65) <= 0.03`],
    ["purchasableButUnverified", "isPurchasable true but price unapproved or stock unverified", "Product", `"isPurchasable" AND (${approver} IS NULL OR NOT ${verified})`],
    ["unapprovedCompareAtShown", "compareAtPrice set but not admin-approved", "Product", `("compareAtPrice" IS NOT NULL OR "compareAtPriceCents" IS NOT NULL) AND NOT ${compareOk}`],
    ["highConfidenceWithoutApproval", "priceConfidence HIGH without approver", "Product", `"priceConfidence" = 'HIGH' AND ${approver} IS NULL`],
    ["inStockStatusUnverified", "availabilityStatus IN_STOCK without verification", "Product", `"availabilityStatus" = 'IN_STOCK' AND NOT ${verified}`],
    ["deliveryZonesUnapproved", "delivery zones not admin-approved", "DeliveryZone", cols.has("DeliveryZone.isApproved") ? `NOT "isApproved"` : "true"],
    ["deliveryZonesWithTemplateValues", "zones using 9.99 / 150 / 50 template values", "DeliveryZone", `"deliveryFee" = 9.99 OR "freeDeliveryMinSpend" = 150 OR "minOrderAmount" = 50`],
    ["ordersVisibleBeforePayment", "paymentStatus PENDING but orderStatus already fulfilment-visible", "Order", `"paymentStatus" = 'PENDING' AND "orderStatus" IN ('RECEIVED','PREPARING','READY','OUT_FOR_DELIVERY')`],
  ];
  if (cols.has("Order.accessTokenHash")) {
    checks.push(["ordersWithoutAccessToken", "legacy orders with no access token (public lookup stays closed)", "Order", `"accessTokenHash" IS NULL`]);
  }
  return checks;
}

async function runCheck(tx, [key, description, table, where]) {
  const countSql = `SELECT count(*)::int AS n FROM "${table}" WHERE ${where}`;
  const sampleSql = `SELECT id FROM "${table}" WHERE ${where} ORDER BY id LIMIT ${SAMPLE_LIMIT}`;
  const [{ n }] = await tx.$queryRawUnsafe(countSql);
  const sample = (await tx.$queryRawUnsafe(sampleSql)).map((r) => r.id);
  return { key, description, table, count: n, sampleIds: sample };
}

async function tableTotals(tx) {
  const tables = ["Product", "Order", "OrderItem", "DeliveryZone", "PaymentEvent", "Customer", "StoreBranch"];
  const out = {};
  for (const t of tables) out[t] = (await tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${t}"`))[0].n;
  return out;
}

function toMarkdown(report) {
  const lines = [`# Reconciliation report`, ``, `Database: ${report.database}`, `Generated: ${report.generatedAt} (read-only)`, ``, `## Table totals`, ``];
  for (const [t, n] of Object.entries(report.totals)) lines.push(`- ${t}: ${n}`);
  lines.push(``, `## Findings`, ``, `| Check | Table | Rows | Sample ids |`, `|---|---|---|---|`);
  for (const c of report.checks) lines.push(`| ${c.description} | ${c.table} | ${c.count} | ${c.sampleIds.join(", ")} |`);
  return lines.join("\n");
}

async function main() {
  const identities = assertSafeDatabaseTarget({ mode: "read", label: "db-reconcile-report" });
  const db = new PrismaClient({ log: [] });
  try {
    const report = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const cols = await columnSet(tx);
      const checks = [];
      for (const check of buildChecks(cols)) checks.push(await runCheck(tx, check));
      return {
        readOnly: true,
        generatedAt: new Date().toISOString(),
        database: formatIdentity(identities),
        migrated: cols.has("Product.stockVerified"),
        totals: await tableTotals(tx),
        checks,
      };
    }, { timeout: 30000 });
    console.log(process.argv.includes("--md") ? toMarkdown(report) : JSON.stringify(report, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ readOnly: true, error: error instanceof Error ? error.message : "RECONCILE_FAILED" }));
  process.exit(1);
});
