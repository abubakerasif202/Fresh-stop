import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonNoStore, requireAdmin, sameOrigin } from "@/lib/admin-route";
import { slugify, validateProductInput } from "@/lib/product-commerce";

const include = {
  category: { select: { id: true, name: true, slug: true } },
  inventory: { select: { storeBranchId: true, isAvailable: true, storeBranch: { select: { slug: true } } } }
} as const;

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const [products, categories, branches] = await Promise.all([
      db.product.findMany({ include, orderBy: [{ isPublished: "asc" }, { name: "asc" }] }),
      db.category.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true, slug: true } }),
      db.storeBranch.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } })
    ]);
    return jsonNoStore({ products, categories, branches });
  } catch {
    console.error("Admin product list failed");
    return jsonNoStore({ error: "Failed to load products." }, 500);
  }
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  if (!sameOrigin(request)) return jsonNoStore({ error: "Invalid request origin." }, 403);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid JSON body." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return jsonNoStore({ error: "Invalid request body." }, 400);

  try {
    const branches = await db.storeBranch.findMany({ where: { isActive: true }, select: { id: true, slug: true } });
    const parsed = validateProductInput(body as Record<string, unknown>, branches.map((b) => b.slug));
    if (!parsed.ok) return jsonNoStore({ error: "Please fix the highlighted fields.", fields: parsed.errors }, 422);
    const v = parsed.value;
    if (!(await db.category.findUnique({ where: { id: v.categoryId }, select: { id: true } }))) {
      return jsonNoStore({ error: "Please fix the highlighted fields.", fields: { categoryId: "Category not found." } }, 422);
    }
    const base = slugify(v.name) || "product";
    let slug = base;
    for (let n = 2; await db.product.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;
    const availability = v.branchAvailability ?? {};
    const product = await db.product.create({
      data: {
        name: v.name,
        slug,
        categoryId: v.categoryId,
        description: v.description,
        imageUrl: v.imageUrl,
        imageAlt: v.imageAlt,
        price: v.price,
        unit: v.unit,
        isPublished: v.isPublished,
        inventory: {
          create: branches
            .filter((b) => availability[b.slug] !== undefined)
            .map((b) => ({ storeBranchId: b.id, isAvailable: availability[b.slug] }))
        }
      },
      include
    });
    return jsonNoStore({ success: true, product }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonNoStore({ error: "A product with that name already exists." }, 409);
    }
    console.error("Admin product create failed");
    return jsonNoStore({ error: "Failed to create product." }, 500);
  }
}
