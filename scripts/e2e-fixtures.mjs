#!/usr/bin/env node
// Seeds clearly-labelled TEST products into the DISPOSABLE local database so the cart/checkout UI can be exercised.
// Usage: node scripts/e2e-fixtures.mjs [seed|clear]
// Refuses any DATABASE_URL that is not localhost. Fixture rows are never part of dataset files or the catalogue baseline.
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function assertLocal() {
  for (const name of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]) {
    const raw = process.env[name];
    if (!raw) {
      console.error(`${name} is not set. Export the disposable local database URL first.`);
      process.exit(1);
    }
    let target;
    try {
      target = new URL(raw);
    } catch {
      console.error(`${name} is not a valid URL.`);
      process.exit(1);
    }
    if (!LOCAL_HOSTS.has(target.hostname.toLowerCase()) || target.port !== "54329" || target.pathname !== "/fresh_stop_dev") {
      console.error(`Refusing to run: ${name} does not point at the disposable local port54329 fresh_stop_dev database.`);
      process.exit(1);
    }
  }
}

const APPROVER = "test-fixture";
const base = { isPublished: true, isActive: true, taxCategory: "GST_FREE", packageQuantity: 1 };
const buyable = { ...base, isPurchasable: true, approvalStatus: "APPROVED", priceApprovedBy: APPROVER, priceApprovedAt: new Date(), priceSource: "ADMIN", stockVerified: true, availabilityStatus: "IN_STOCK" };

const FIXTURES = [
  { slug: "test-apples-1kg", name: "TEST Apples 1kg", imageUrl: "/products/bravo-apples-1kg.webp", unit: "kg", priceCents: 450, price: 4.5, stockQuantity: 50, ...buyable },
  { slug: "test-bananas-1kg", name: "TEST Bananas 1kg", imageUrl: "/products/cavendish-bananas-1kg.webp", unit: "kg", priceCents: 399, price: 3.99, stockQuantity: 30, ...buyable },
  { slug: "test-low-stock-blueberries", name: "TEST Low Stock Blueberries 125g", imageUrl: "/products/blueberries-125g.webp", unit: "125g punnet", priceCents: 599, price: 5.99, stockQuantity: 2, ...buyable },
  { slug: "test-with-approved-was-price", name: "TEST Milk 2L With Approved Was Price", imageUrl: "/products/farm-full-cream-milk-2l.webp", unit: "2L bottle", priceCents: 300, price: 3, compareAtPrice: 4, compareAtApproved: true, stockQuantity: 20, ...buyable },
  { slug: "test-unapproved-compare-at", name: "TEST Box With UNAPPROVED Compare Price", imageUrl: "/products/family-mixed-box.webp", unit: "box", priceCents: 2500, price: 25, compareAtPrice: 40, compareAtApproved: false, stockQuantity: 5, ...buyable },
  { slug: "test-pending-price-sourdough", name: "TEST Pending Price Sourdough", imageUrl: "/products/artisanal-sourdough-loaf.webp", unit: "loaf", ...base, isPurchasable: false, approvalStatus: "PENDING", availabilityStatus: "UNKNOWN" },
  { slug: "test-approved-price-unknown-stock", name: "TEST Approved Price Unknown Stock", imageUrl: "/products/bravo-apples-1kg.webp", unit: "each", priceCents: 700, price: 7, ...base, isPurchasable: true, approvalStatus: "APPROVED", priceApprovedBy: APPROVER, priceApprovedAt: new Date(), priceSource: "ADMIN", stockVerified: false, stockQuantity: null, availabilityStatus: "UNKNOWN" },
  { slug: "test-out-of-stock-bananas", name: "TEST Out Of Stock Bananas", imageUrl: "/products/cavendish-bananas-1kg.webp", unit: "kg", priceCents: 350, price: 3.5, stockQuantity: 0, ...buyable, availabilityStatus: "OUT_OF_STOCK" }
];

async function main() {
  assertLocal();
  const mode = process.argv[2] ?? "seed";
  const db = new PrismaClient();
  try {
    if (mode === "clear") {
      const products = await db.product.findMany({ where: { slug: { in: FIXTURES.map((fixture) => fixture.slug) } }, select: { id: true } });
      const order = await db.order.findUnique({ where: { orderNumber: "FS-TEST-UI-ORDER" }, select: { id: true } });
      const zone = await db.deliveryZone.findFirst({ where: { name: "TEST UI Delivery Zone" }, select: { id: true } });
      const entityIds = [...products.map((product) => product.id), ...(order ? [order.id] : []), ...(zone ? [zone.id] : [])];
      if (entityIds.length) await db.adminAuditLog.deleteMany({ where: { entityId: { in: entityIds }, adminUser: "local-qa" } });
      await db.order.deleteMany({ where: { orderNumber: "FS-TEST-UI-ORDER" } });
      await db.storeBranch.deleteMany({ where: { slug: "test-ui-branch" } });
      await db.deliveryZone.deleteMany({ where: { name: "TEST UI Delivery Zone" } });
      await db.paymentEvent.deleteMany({ where: { stripeEventId: "evt_test_ui_payment_review" } });
      const { count } = await db.product.deleteMany({ where: { slug: { in: FIXTURES.map((fixture) => fixture.slug) } } });
      await db.category.deleteMany({ where: { slug: "test-fixtures", products: { none: {} } } });
      console.log(`Removed ${count} TEST products.`);
      return;
    }
    if (mode !== "seed") throw new Error("Usage: e2e-fixtures.mjs [seed|clear]");
    const category = await db.category.upsert({ where: { slug: "test-fixtures" }, update: {}, create: { name: "TEST Fixtures", slug: "test-fixtures" } });
    for (const fixture of FIXTURES) {
      const data = { ...fixture, categoryId: category.id };
      await db.product.upsert({ where: { slug: fixture.slug }, update: data, create: data });
    }
    await db.storeBranch.upsert({ where: { slug: "test-ui-branch" }, update: {}, create: { slug: "test-ui-branch", name: "TEST UI Branch", address: "TEST fixture", suburb: "TEST", postcode: "2999", phone: "", email: "test-ui@example.test", googleMapsUrl: "", openingHours: "TEST only" } });
    await db.order.upsert({ where: { orderNumber: "FS-TEST-UI-ORDER" }, update: {}, create: { orderNumber: "FS-TEST-UI-ORDER", fulfillmentType: "PICKUP", customerName: "TEST UI Customer", customerEmail: "test-ui@example.test", customerPhone: "0400000000", itemsJson: JSON.stringify([{ name: "TEST Apples 1kg", unit: "kg", quantity: 1, totalCents: 450 }]), subtotal: 4.5, total: 4.5, totalCents: 450, paymentStatus: "PENDING", orderStatus: "PENDING_PAYMENT", accessTokenHash: createHash("sha256").update("test-ui-disposable-order-token-2026").digest("hex") } });
    if (!await db.deliveryZone.findFirst({ where: { name: "TEST UI Delivery Zone" } })) await db.deliveryZone.create({ data: { name: "TEST UI Delivery Zone", postcodes: "2999", deliveryFee: 0, freeDeliveryMinSpend: 0, minOrderAmount: 0, deliveryFeeCents: 800, primaryBranchSlug: "test-ui-branch" } });
    await db.paymentEvent.upsert({ where: { stripeEventId: "evt_test_ui_payment_review" }, update: {}, create: { stripeEventId: "evt_test_ui_payment_review", eventType: "TEST_UI_FIXTURE", status: "FAILED", lastError: "TEST_PAYMENT_REVIEW" } });
    console.log(`Seeded ${FIXTURES.length} TEST products in category "TEST Fixtures".`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.name : "FixtureError");
  process.exit(1);
});
