import { PrismaClient } from "@prisma/client";
import { assertSafeDatabaseTarget, formatIdentity } from "../scripts/db-guard.mjs";

const prisma = new PrismaClient();

async function main() {
  // Local-only: refuses any non-localhost DATABASE_URL unless ALLOW_REMOTE_DB_WRITE=yes-i-approved.
  const identities = assertSafeDatabaseTarget({ mode: "write", label: "prisma/seed" });
  if (process.env.NODE_ENV === "production" || process.env.VERCEL || process.env.ALLOW_DEVELOPMENT_SEED !== "1") {
    throw new Error("Seeding requires ALLOW_DEVELOPMENT_SEED=1 and must not run in production.");
  }
  console.log("Target:", formatIdentity(identities));
  console.log("Seeding Fresh Stop database...");

  // 1. Branches
  await prisma.storeBranch.upsert({
    where: { slug: "rockdale" },
    update: {
      name: "Fresh Stop Rockdale",
      address: "Shop 1, 2-4 King Street",
      suburb: "Rockdale",
      state: "NSW",
      postcode: "2216",
      phone: "0423 936 586",
      email: "rockdale@freshstop.com.au",
      googleMapsUrl: "https://maps.google.com/?q=Shop+1+2-4+King+Street+Rockdale+NSW+2216",
      openingHours: JSON.stringify({
        mon_sat: "7:00 AM - 7:30 PM",
        sun: "8:00 AM - 6:00 PM"
      })
    },
    create: {
      name: "Fresh Stop Rockdale",
      slug: "rockdale",
      address: "Shop 1, 2-4 King Street",
      suburb: "Rockdale",
      state: "NSW",
      postcode: "2216",
      phone: "0423 936 586",
      email: "rockdale@freshstop.com.au",
      googleMapsUrl: "https://maps.google.com/?q=Shop+1+2-4+King+Street+Rockdale+NSW+2216",
      openingHours: JSON.stringify({
        mon_sat: "7:00 AM - 7:30 PM",
        sun: "8:00 AM - 6:00 PM"
      })
    }
  });

  await prisma.storeBranch.upsert({
    where: { slug: "riverwood" },
    update: {
      name: "Fresh Stop Riverwood",
      address: "319 Belmore Rd",
      suburb: "Riverwood",
      state: "NSW",
      postcode: "2210",
      phone: "0423 936 586",
      email: "riverwood@freshstop.com.au",
      googleMapsUrl: "https://maps.app.goo.gl/QACdGqVR9zqDeseG9",
      openingHours: JSON.stringify({
        mon_sat: "7:00 AM - 7:30 PM",
        sun: "8:00 AM - 6:00 PM"
      })
    },
    create: {
      name: "Fresh Stop Riverwood",
      slug: "riverwood",
      address: "319 Belmore Rd",
      suburb: "Riverwood",
      state: "NSW",
      postcode: "2210",
      phone: "0423 936 586",
      email: "riverwood@freshstop.com.au",
      googleMapsUrl: "https://maps.app.goo.gl/QACdGqVR9zqDeseG9",
      openingHours: JSON.stringify({
        mon_sat: "7:00 AM - 7:30 PM",
        sun: "8:00 AM - 6:00 PM"
      })
    }
  });

  // 2. Delivery zones are NOT seeded: fees, minimums and free-delivery thresholds are business
  // facts that an admin must enter and approve (DeliveryZone.isApproved). Nothing is invented here.

  // 3. Categories
  const categories = [
    { name: "Fresh Fruits", slug: "fruits", description: "Seasonal Australian fresh fruits" },
    { name: "Fresh Vegetables", slug: "vegetables", description: "Farm fresh greens & vegetables" },
    { name: "Seasonal Boxes", slug: "boxes", description: "Curated produce boxes for home cooking" },
    { name: "Dairy & Chilled", slug: "dairy", description: "Farm milk, fresh eggs & artisan cheeses" },
    { name: "Pantry Staples", slug: "pantry", description: "Sourdough, honey, oils & dry goods" }
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description
      },
      create: cat
    });
  }

  const fruitsCat = await prisma.category.findUnique({ where: { slug: "fruits" } });
  const vegCat = await prisma.category.findUnique({ where: { slug: "vegetables" } });
  const boxesCat = await prisma.category.findUnique({ where: { slug: "boxes" } });
  const dairyCat = await prisma.category.findUnique({ where: { slug: "dairy" } });
  const pantryCat = await prisma.category.findUnique({ where: { slug: "pantry" } });

  // 4. Products
  const products = [
    {
      name: "Cavendish Bananas",
      slug: "cavendish-bananas-1kg",
      description: "Sweet, energizing Australian Cavendish bananas.",
      imageUrl: "/products/cavendish-bananas-1kg.webp",
      categoryId: fruitsCat!.id
    },
    {
      name: "Fresh Strawberries",
      slug: "strawberries-250g",
      description: "Ripe and juicy Queensland strawberries.",
      imageUrl: "/products/strawberries-250g.webp",
      categoryId: fruitsCat!.id
    },
    {
      name: "Australian Blueberries",
      slug: "blueberries-125g",
      description: "Sweet and antioxidant-rich local blueberries.",
      imageUrl: "/products/blueberries-125g.webp",
      categoryId: fruitsCat!.id
    },
    {
      name: "Bravo Apples",
      slug: "bravo-apples-1kg",
      description: "Distinctive burgundy-skinned Australian apples with crisp, sweet flesh.",
      imageUrl: "/products/bravo-apples-1kg.webp",
      categoryId: fruitsCat!.id
    },
    {
      name: "Hass Avocados",
      slug: "hass-avocados",
      description: "Creamy, rich Hass avocados, perfect for salads and toast.",
      imageUrl: "/products/hass-avocados.webp",
      categoryId: fruitsCat!.id
    },
    {
      name: "Crisp Green Broccoli",
      slug: "fresh-broccoli-head",
      description: "Farm-picked broccoli heads, firm and loaded with vitamins.",
      imageUrl: "/products/fresh-broccoli-head.webp",
      categoryId: vegCat!.id
    },
    {
      name: "Roma Tomatoes",
      slug: "roma-tomatoes-1kg",
      description: "Plump, sun-ripened Roma tomatoes ideal for sauces and slicing.",
      imageUrl: "/products/roma-tomatoes-1kg.webp",
      categoryId: vegCat!.id
    },
    {
      name: "Fresh Stop Family Mixed Box",
      slug: "family-mixed-box",
      description: "Our signature seasonal box containing 10+ varieties of hand-picked fruits and cooking vegetables.",
      imageUrl: "/products/family-mixed-box.webp",
      categoryId: boxesCat!.id
    },
    {
      name: "Fresh Farm Full Cream Milk 2L",
      slug: "farm-full-cream-milk-2l",
      description: "100% Australian fresh farm milk, pasteurized and non-homogenized.",
      imageUrl: "/products/farm-full-cream-milk-2l.webp",
      categoryId: dairyCat!.id
    },
    {
      name: "Local Free Range Eggs (700g)",
      slug: "free-range-eggs-dozen",
      description: "Farm fresh pastured eggs from free roaming hens.",
      imageUrl: "/products/free-range-eggs-dozen.webp",
      categoryId: dairyCat!.id
    },
    {
      name: "Artisanal Sourdough Loaf",
      slug: "artisanal-sourdough-loaf",
      description: "Freshly baked sourdough with a crisp crust and chewy open crumb.",
      imageUrl: "/products/artisanal-sourdough-loaf.webp",
      categoryId: pantryCat!.id
    }
  ];

  // Catalogue identity only. Price, stock and unit stay unset (fail closed): every product is
  // created PENDING / not purchasable (schema defaults) until an admin approves price and
  // counts stock. Existing rows keep whatever an admin already set.
  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { name: p.name, description: p.description, imageUrl: p.imageUrl, categoryId: p.categoryId },
      create: p
    });
  }

  console.log("Seeding complete! 2 branches, 5 categories and unpriced PENDING products created. No zones, prices or stock seeded.");
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error instanceof Error ? error.message : "unknown error");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
