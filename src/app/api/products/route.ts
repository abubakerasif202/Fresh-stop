import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const specialOnly = searchParams.get("special") === "true";
  const search = searchParams.get("q")?.trim() || "";
  const branchSlug = searchParams.get("branch");
  const limit = Number(searchParams.get("limit") || 100);
  if (search.length > 100 || (categorySlug?.length ?? 0) > 100 || (branchSlug?.length ?? 0) > 100 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: "Invalid catalogue filters" }, { status: 400 });
  }

  const where: Prisma.ProductWhereInput = {};

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (specialOnly) {
    where.isSpecial = true;
  }

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  if (branchSlug) {
    where.inventory = {
      some: {
        storeBranch: { slug: branchSlug, isActive: true },
        isAvailable: true
      }
    };
  }

  try {
    const products = await db.product.findMany({
      where,
      take: limit,
      include: { category: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(products);
  } catch {
    console.error("Catalogue query failed");
    return NextResponse.json({ error: "Failed to query products" }, { status: 500 });
  }
}
