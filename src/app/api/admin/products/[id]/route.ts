import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonNoStore, requireAdmin, requireWritableAdmin, sameOrigin } from "@/lib/admin-route";
import { validateProductInput } from "@/lib/product-commerce";

type Ctx = { params: Promise<{ id: string }> };

/** Replaces the editable commerce fields; never touches orders, special pricing or the slug. */
export async function PATCH(request: Request, { params }: Ctx) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const readOnly = requireWritableAdmin();
  if (readOnly) return readOnly;
  if (!sameOrigin(request)) return jsonNoStore({ error: "Invalid request origin." }, 403);
  const { id } = await params;
  if (!id || id.length > 64) return jsonNoStore({ error: "Invalid product id." }, 400);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid JSON body." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return jsonNoStore({ error: "Invalid request body." }, 400);

  try {
    const existing = await db.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return jsonNoStore({ error: "Product not found." }, 404);
    const branches = await db.storeBranch.findMany({ where: { isActive: true }, select: { id: true, slug: true } });
    const parsed = validateProductInput(body as Record<string, unknown>, branches.map((b) => b.slug));
    if (!parsed.ok) return jsonNoStore({ error: "Please fix the highlighted fields.", fields: parsed.errors }, 422);
    const v = parsed.value;
    if (!(await db.category.findUnique({ where: { id: v.categoryId }, select: { id: true } }))) {
      return jsonNoStore({ error: "Please fix the highlighted fields.", fields: { categoryId: "Category not found." } }, 422);
    }
    const availability = v.branchAvailability;
    const product = await db.$transaction(async (tx) => {
      if (availability) {
        for (const b of branches) {
          const isAvailable = availability[b.slug];
          if (isAvailable === undefined) continue;
          await tx.branchInventory.upsert({
            where: { storeBranchId_productId: { storeBranchId: b.id, productId: id } },
            create: { storeBranchId: b.id, productId: id, isAvailable },
            update: { isAvailable }
          });
        }
      }
      return tx.product.update({
        where: { id },
        data: {
          name: v.name,
          categoryId: v.categoryId,
          description: v.description,
          imageUrl: v.imageUrl,
          imageAlt: v.imageAlt,
          price: v.price,
          unit: v.unit,
          isPublished: v.isPublished
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          inventory: { select: { storeBranchId: true, isAvailable: true, storeBranch: { select: { slug: true } } } }
        }
      });
    });
    return jsonNoStore({ success: true, product });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonNoStore({ error: "Product not found." }, 404);
    }
    console.error("Admin product update failed");
    return jsonNoStore({ error: "Failed to update product." }, 500);
  }
}
