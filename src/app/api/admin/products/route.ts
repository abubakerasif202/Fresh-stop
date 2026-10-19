import { getCatalogue, getCategories, getStores } from "@/lib/catalogue-data";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/admin-route";
import { adminErrorResponse, guardAdminMutation, jsonError, recordAudit } from "@/lib/admin-audit";
import { slugify, validateProductInput } from "@/lib/product-commerce";
import { PRODUCT_SELECT, withCommerceState } from "@/lib/admin-product-view";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    if (process.env.CATALOGUE_DATA_SOURCE === "reviewed-snapshot") {
      const [reviewed, categories, stores] = await Promise.all([getCatalogue(), getCategories(), getStores()]);
      const products = reviewed.map((product) => ({ ...product, price: null, unit: null, inventory: [], isPublished: product.source === "database" }));
      const branches = stores.map(({ id, slug, name }) => ({ id, slug, name }));
      return jsonNoStore({ readOnly: true, products, categories, branches });
    }
    const [products, categories, branches] = await Promise.all([
      db.product.findMany({ select: PRODUCT_SELECT, orderBy: [{ isPublished: "asc" }, { name: "asc" }] }),
      db.category.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true, slug: true } }),
      db.storeBranch.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } })
    ]);
    return jsonNoStore({ products: products.map(withCommerceState), categories, branches });
  } catch (error) {
    return adminErrorResponse(error, "Loading products");
  }
}

export async function POST(request: Request) {
  const guard = await guardAdminMutation(request);
  if (!guard.ok) return guard.response;
  try {
    const branches = await db.storeBranch.findMany({ where: { isActive: true }, select: { id: true, slug: true } });
    // Prices are never set here: they go through the per-product approval workflow.
    const parsed = validateProductInput({ ...guard.body, price: null }, branches.map((b) => b.slug));
    if (!parsed.ok) return jsonError("Please fix the highlighted fields.", 422, { fields: parsed.errors });
    const v = parsed.value;
    if (!(await db.category.findUnique({ where: { id: v.categoryId }, select: { id: true } }))) {
      return jsonError("Please fix the highlighted fields.", 422, { fields: { categoryId: "Category not found." } });
    }
    const base = slugify(v.name) || "product";
    let slug = base;
    for (let n = 2; await db.product.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;
    const availability = v.branchAvailability ?? {};
    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: v.name, slug, categoryId: v.categoryId, description: v.description, imageUrl: v.imageUrl, imageAlt: v.imageAlt,
          unit: v.unit, isPublished: v.isPublished,
          inventory: { create: branches.filter((b) => availability[b.slug] !== undefined).map((b) => ({ storeBranchId: b.id, isAvailable: availability[b.slug] })) }
        },
        select: PRODUCT_SELECT
      });
      await recordAudit(tx, {
        action: "PRODUCT_CREATED", entityType: "Product", entityId: created.id, admin: guard.admin,
        after: { name: v.name, slug, categoryId: v.categoryId, unit: v.unit, isPublished: v.isPublished }, details: `Created product ${v.name}`
      });
      return created;
    });
    return jsonNoStore({ success: true, product: withCommerceState(product) }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return jsonError("A product with that name already exists.", 409);
    return adminErrorResponse(error, "Creating product");
  }
}
