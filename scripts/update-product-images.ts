/**
 * Updates ONLY Product.imageUrl (by slug) in the existing database.
 * No deletes, no other fields touched.
 * Run: npx tsx scripts/update-product-images.ts
 */
import { PrismaClient } from "@prisma/client";
import { assertSafeDatabaseTarget, formatIdentity } from "./db-guard.mjs";

const prisma = new PrismaClient();

const IMAGES: Record<string, string> = {
  "cavendish-bananas-1kg": "/products/cavendish-bananas-1kg.webp",
  "strawberries-250g": "/products/strawberries-250g.webp",
  "blueberries-125g": "/products/blueberries-125g.webp",
  "bravo-apples-1kg": "/products/bravo-apples-1kg.webp",
  "hass-avocados": "/products/hass-avocados.webp",
  "fresh-broccoli-head": "/products/fresh-broccoli-head.webp",
  "roma-tomatoes-1kg": "/products/roma-tomatoes-1kg.webp",
  "family-mixed-box": "/products/family-mixed-box.webp",
  "farm-full-cream-milk-2l": "/products/farm-full-cream-milk-2l.webp",
  "free-range-eggs-dozen": "/products/free-range-eggs-dozen.webp",
  "artisanal-sourdough-loaf": "/products/artisanal-sourdough-loaf.webp",
};

async function main() {
  console.log(formatIdentity(assertSafeDatabaseTarget({ mode: "write", label: "update-product-images" })));
  for (const [slug, imageUrl] of Object.entries(IMAGES)) {
    const existing = await prisma.product.findUnique({ where: { slug }, select: { imageUrl: true } });
    if (!existing) {
      console.log(`SKIP ${slug}: not found`);
      continue;
    }
    await prisma.product.update({ where: { slug }, data: { imageUrl } });
    console.log(`${slug}\n  before: ${existing.imageUrl}\n  after:  ${imageUrl}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
