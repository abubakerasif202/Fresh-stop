import { randomBytes } from "node:crypto";
import type { PrismaClient, Product } from "@prisma/client";

export function uniqueId(prefix: string): string {
  return `${prefix}-${randomBytes(5).toString("hex")}`;
}

export async function createTestCategory(db: PrismaClient) {
  const id = uniqueId("tcat");
  return db.category.create({ data: { id, name: id, slug: id } });
}

/** A fully purchasable product by default; override fields to test rejection paths. */
export async function createTestProduct(
  db: PrismaClient,
  categoryId: string,
  overrides: Partial<Omit<Product, "id" | "categoryId">> = {}
): Promise<Product> {
  const slug = uniqueId("tprod");
  return db.product.create({
    data: {
      name: `Test ${slug}`,
      slug,
      imageUrl: "/products/test.webp",
      categoryId,
      priceCents: 500,
      price: null,
      unit: "each",
      isPublished: true,
      isActive: true,
      isPurchasable: true,
      approvalStatus: "APPROVED",
      priceApprovedBy: "test-admin",
      priceSource: "ADMIN",
      stockVerified: true,
      stockQuantity: 10,
      reservedQuantity: 0,
      taxCategory: "GST_FREE",
      taxCategoryApprovedBy: "test-admin",
      taxCategoryApprovedAt: new Date(),
      ...overrides
    }
  });
}

export async function createTestOrder(db: PrismaClient, overrides: Record<string, unknown> = {}) {
  const orderNumber = uniqueId("FS-T").toUpperCase();
  return db.order.create({
    data: {
      orderNumber,
      fulfillmentType: "PICKUP",
      customerName: "Test Customer",
      customerEmail: "test@example.test",
      customerPhone: "0412345678",
      itemsJson: "[]",
      subtotal: 0,
      total: 0,
      paymentStatus: "PENDING",
      orderStatus: "PENDING_PAYMENT",
      ...overrides
    }
  });
}

export async function cleanupTestData(
  db: PrismaClient,
  ids: { orderIds?: string[]; productIds?: string[]; categoryIds?: string[]; zoneIds?: string[] }
) {
  if (ids.orderIds?.length) await db.order.deleteMany({ where: { id: { in: ids.orderIds } } });
  if (ids.productIds?.length) await db.product.deleteMany({ where: { id: { in: ids.productIds } } });
  if (ids.categoryIds?.length) await db.category.deleteMany({ where: { id: { in: ids.categoryIds } } });
  if (ids.zoneIds?.length) await db.deliveryZone.deleteMany({ where: { id: { in: ids.zoneIds } } });
}

/** Random 4-digit postcode in a range no real Australian postcode uses, so tests never collide with real zones. */
export function testPostcode(): string {
  return String(8000 + Math.floor(Math.random() * 2000));
}

export async function createTestZone(
  db: PrismaClient,
  postcode: string,
  overrides: Record<string, unknown> = {}
) {
  await db.storeBranch.upsert({
    where: { slug: "test-branch" },
    update: {},
    create: {
      slug: "test-branch", name: "Test delivery branch", address: "Test address", suburb: "Test suburb",
      postcode: "8000", phone: "0412345678", email: "test@example.invalid", googleMapsUrl: "", openingHours: "Test only"
    }
  });
  return db.deliveryZone.create({
    data: {
      name: uniqueId("Zone"),
      postcodes: postcode,
      // Deprecated Float columns are required by the schema but unused by the application.
      deliveryFee: 0,
      freeDeliveryMinSpend: 0,
      minOrderAmount: 0,
      primaryBranchSlug: "test-branch",
      isActive: true,
      isApproved: true,
      approvedBy: "test-admin",
      deliveryFeeCents: 700,
      freeDeliveryMinCents: 5000,
      minOrderCents: null,
      ...overrides
    }
  });
}
