import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonNoStore } from "@/lib/admin-route";
import { AdminHttpError, adminErrorResponse, guardAdminMutation, jsonError, recordAudit } from "@/lib/admin-audit";
import { validateProductInput } from "@/lib/product-commerce";
import { PRODUCT_SELECT, withCommerceState } from "@/lib/admin-product-view";

type Ctx = { params: Promise<{ id: string }> };

interface CatalogueFields {
  name: string; categoryId: string; description: string | null; imageUrl: string; imageAlt: string | null; unit: string | null; isPublished: boolean;
}
const catalogueView = (p: CatalogueFields): CatalogueFields => ({
  name: p.name, categoryId: p.categoryId, description: p.description, imageUrl: p.imageUrl, imageAlt: p.imageAlt, unit: p.unit, isPublished: p.isPublished
});

/** Replaces editable catalogue fields. Never touches price, stock, orders, special pricing or the slug. */
export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await guardAdminMutation(request);
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!id || id.length > 64) return jsonError("Invalid product id.", 400);
  try {
    const branches = await db.storeBranch.findMany({ where: { isActive: true }, select: { id: true, slug: true } });
    const parsed = validateProductInput({ ...guard.body, price: null }, branches.map((b) => b.slug));
    if (!parsed.ok) return jsonError("Please fix the highlighted fields.", 422, { fields: parsed.errors });
    const v = parsed.value;
    if (!(await db.category.findUnique({ where: { id: v.categoryId }, select: { id: true } }))) {
      return jsonError("Please fix the highlighted fields.", 422, { fields: { categoryId: "Category not found." } });
    }
    const product = await db.$transaction(async (tx) => {
      const before = await tx.product.findUnique({ where: { id } });
      if (!before) throw new AdminHttpError(404, "Product not found.");
      for (const b of branches) {
        const isAvailable = v.branchAvailability?.[b.slug];
        if (isAvailable === undefined) continue;
        await tx.branchInventory.upsert({
          where: { storeBranchId_productId: { storeBranchId: b.id, productId: id } },
          create: { storeBranchId: b.id, productId: id, isAvailable }, update: { isAvailable }
        });
      }
      const unitChanged = v.unit !== before.unit;
      const data = {
        name: v.name, categoryId: v.categoryId, description: v.description, imageUrl: v.imageUrl, imageAlt: v.imageAlt, unit: v.unit, isPublished: v.isPublished,
        ...(unitChanged ? { approvalStatus: "PENDING", priceApprovedBy: null, priceApprovedAt: null, priceSource: null, isPurchasable: false, compareAtApproved: false } : {})
      };
      const updated = await tx.product.update({ where: { id }, data, select: PRODUCT_SELECT });
      await recordAudit(tx, {
        action: "PRODUCT_UPDATED", entityType: "Product", entityId: id, admin: guard.admin,
        before: catalogueView(before), after: data, details: `Updated product ${v.name}`
      });
      return updated;
    });
    return jsonNoStore({ success: true, product: withCommerceState(product) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return jsonError("Product not found.", 404);
    return adminErrorResponse(error, "Updating product");
  }
}
