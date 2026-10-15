import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const specialOnly = searchParams.get("special") === "true";
  const search = searchParams.get("q")?.trim() || "";
  const branchSlug = searchParams.get("branch");

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
        storeBranch: { slug: branchSlug },
        isAvailable: true
      }
    };
  }

  try {
    const products = await db.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to query products:", error);
    return NextResponse.json({ error: "Failed to query products" }, { status: 500 });
  }
}
