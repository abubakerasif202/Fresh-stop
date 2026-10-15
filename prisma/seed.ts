import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Fresh Stop database...");

  // 1. Branches
  const rockdale = await prisma.storeBranch.upsert({
    where: { slug: "rockdale" },
    update: {
      name: "Fresh Stop Rockdale",
      address: "Shop 1, 2-4 King Street",
      suburb: "Rockdale",
      state: "NSW",
      postcode: "2216",
      phone: "(02) 9567 1188",
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
      phone: "(02) 9567 1188",
      email: "rockdale@freshstop.com.au",
      googleMapsUrl: "https://maps.google.com/?q=Shop+1+2-4+King+Street+Rockdale+NSW+2216",
      openingHours: JSON.stringify({
        mon_sat: "7:00 AM - 7:30 PM",
        sun: "8:00 AM - 6:00 PM"
      })
    }
  });

  const riverwood = await prisma.storeBranch.upsert({
    where: { slug: "riverwood" },
    update: {
      name: "Fresh Stop Riverwood",
      address: "319 Belmore Rd",
      suburb: "Riverwood",
      state: "NSW",
      postcode: "2210",
      phone: "(02) 9534 8822",
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
      phone: "(02) 9534 8822",
      email: "riverwood@freshstop.com.au",
      googleMapsUrl: "https://maps.app.goo.gl/QACdGqVR9zqDeseG9",
      openingHours: JSON.stringify({
        mon_sat: "7:00 AM - 7:30 PM",
        sun: "8:00 AM - 6:00 PM"
      })
    }
  });

  // 2. Delivery Zones
  await prisma.deliveryZone.deleteMany();
  await prisma.deliveryZone.createMany({
    data: [
      {
        name: "St George & Bayside",
        postcodes: "2216,2217,2218,2220,2205,2207,2219,2221",
        deliveryFee: 9.99,
        freeDeliveryMinSpend: 150.0,
        minOrderAmount: 50.0,
        primaryBranchSlug: "rockdale"
      },
      {
        name: "Canterbury-Bankstown & Georges River",
        postcodes: "2210,2209,2211,2212,2196,2213,2208,2214",
        deliveryFee: 9.99,
        freeDeliveryMinSpend: 150.0,
        minOrderAmount: 50.0,
        primaryBranchSlug: "riverwood"
      }
    ]
  });

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
      price: 3.99,
      unit: "1kg pack",
      isSpecial: true,
      specialPrice: 3.49,
      imageUrl: "/products/cavendish-bananas-1kg.webp",
      categoryId: fruitsCat!.id
    },
    {
      name: "Fresh Strawberries",
      slug: "strawberries-250g",
      description: "Ripe and juicy Queensland strawberries. Super special offer!",
      price: 4.50,
      unit: "250g punnet",
      isSpecial: true,
      specialPrice: 3.33, // 3 for $10
      imageUrl: "/products/strawberries-250g.webp",
      categoryId: fruitsCat!.id
    },
    {
      name: "Australian Blueberries",
      slug: "blueberries-125g",
      description: "Sweet and antioxidant-rich local blueberries.",
      price: 4.50,
      unit: "125g punnet",
      isSpecial: true,
      specialPrice: 3.33,
      imageUrl: "/products/blueberries-125g.webp",
      categoryId: fruitsCat!.id
    },
    {
      name: "Bravo Apples",
      slug: "bravo-apples-1kg",
      description: "Distinctive burgundy-skinned Australian apples with crisp, sweet flesh.",
      price: 5.99,
      unit: "1kg bag",
      isSpecial: true,
      specialPrice: 4.99,
      imageUrl: "/products/bravo-apples-1kg.webp",
      categoryId: fruitsCat!.id
    },
    {
      name: "Hass Avocados",
      slug: "hass-avocados",
      description: "Creamy, rich Hass avocados, perfect for salads and toast.",
      price: 2.50,
      unit: "each",
      isSpecial: true,
      specialPrice: 1.99,
      imageUrl: "/products/hass-avocados.webp",
      categoryId: fruitsCat!.id
    },
    {
      name: "Crisp Green Broccoli",
      slug: "fresh-broccoli-head",
      description: "Farm-picked broccoli heads, firm and loaded with vitamins.",
      price: 4.99,
      unit: "kg",
      isSpecial: false,
      imageUrl: "/products/fresh-broccoli-head.webp",
      categoryId: vegCat!.id
    },
    {
      name: "Roma Tomatoes",
      slug: "roma-tomatoes-1kg",
      description: "Plump, sun-ripened Roma tomatoes ideal for sauces and slicing.",
      price: 5.49,
      unit: "1kg pack",
      isSpecial: false,
      imageUrl: "/products/roma-tomatoes-1kg.webp",
      categoryId: vegCat!.id
    },
    {
      name: "Fresh Stop Family Mixed Box",
      slug: "family-mixed-box",
      description: "Our signature seasonal box containing 10+ varieties of hand-picked fruits and cooking vegetables.",
      price: 49.99,
      unit: "box",
      isSpecial: true,
      specialPrice: 44.99,
      imageUrl: "/products/family-mixed-box.webp",
      categoryId: boxesCat!.id
    },
    {
      name: "Fresh Farm Full Cream Milk 2L",
      slug: "farm-full-cream-milk-2l",
      description: "100% Australian fresh farm milk, pasteurized and non-homogenized.",
      price: 4.20,
      unit: "2L bottle",
      isSpecial: false,
      imageUrl: "/products/farm-full-cream-milk-2l.webp",
      categoryId: dairyCat!.id
    },
    {
      name: "Local Free Range Eggs (700g)",
      slug: "free-range-eggs-dozen",
      description: "Farm fresh pastured eggs from free roaming hens.",
      price: 6.99,
      unit: "12 pack",
      isSpecial: false,
      imageUrl: "/products/free-range-eggs-dozen.webp",
      categoryId: dairyCat!.id
    },
    {
      name: "Artisanal Sourdough Loaf",
      slug: "artisanal-sourdough-loaf",
      description: "Freshly baked sourdough with a crisp crust and chewy open crumb.",
      price: 7.50,
      unit: "loaf",
      isSpecial: false,
      imageUrl: "/products/artisanal-sourdough-loaf.webp",
      categoryId: pantryCat!.id
    }
  ];

  for (const p of products) {
    const createdProduct = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        unit: p.unit,
        isSpecial: p.isSpecial,
        specialPrice: p.specialPrice,
        imageUrl: p.imageUrl,
        categoryId: p.categoryId
      },
      create: p
    });

    // Make available in both branches
    await prisma.branchInventory.upsert({
      where: {
        storeBranchId_productId: {
          storeBranchId: rockdale.id,
          productId: createdProduct.id
        }
      },
      update: { isAvailable: true },
      create: {
        storeBranchId: rockdale.id,
        productId: createdProduct.id,
        isAvailable: true
      }
    });

    await prisma.branchInventory.upsert({
      where: {
        storeBranchId_productId: {
          storeBranchId: riverwood.id,
          productId: createdProduct.id
        }
      },
      update: { isAvailable: true },
      create: {
        storeBranchId: riverwood.id,
        productId: createdProduct.id,
        isAvailable: true
      }
    });
  }

  console.log("Seeding complete! 2 branches, 2 zones, 5 categories, and initial products created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
