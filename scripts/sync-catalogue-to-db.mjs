import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { catalogueCategories, catalogueCandidates } from "../src/data/catalogue-candidates.ts";

const envContent = readFileSync("C:/Users/abuba/fresh-stop/.env.local", "utf8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    envVars[key] = val;
  }
}

const dbUrl = envVars.POSTGRES_PRISMA_URL || envVars.DATABASE_URL;
const db = new PrismaClient({ datasources: { db: { url: dbUrl } } });

const pricingDataset = JSON.parse(readFileSync("C:/Users/abuba/fresh-stop/src/data/sydney-pricing-dataset.json", "utf8"));
const pricingMap = new Map(pricingDataset.map(item => [item.slug, item]));

async function main() {
  console.log("Starting catalogue synchronization to Supabase PostgreSQL database...");

  // 1. Sync Categories
  const categoryDefs = [
    ...catalogueCategories,
    { slug: "boxes", name: "Seasonal Boxes", description: "Curated produce boxes for home cooking" },
    { slug: "dairy", name: "Dairy & Chilled", description: "Farm milk, fresh eggs & artisan cheeses" }
  ];

  const categoryMap = new Map();
  for (let i = 0; i < categoryDefs.length; i++) {
    const cat = categoryDefs[i];
    const record = await db.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        displayOrder: i + 1
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        displayOrder: i + 1
      }
    });
    categoryMap.set(cat.slug, record.id);
  }
  console.log(`Synchronized ${categoryMap.size} categories.`);

  // 2. Fetch Branches for Inventory
  const branches = await db.storeBranch.findMany({ where: { isActive: true } });
  console.log(`Found ${branches.length} store branches for inventory initialization.`);

  // 3. Prepare All Products
  const baseline = JSON.parse(readFileSync("C:/Users/abuba/fresh-stop/src/data/catalogue-baseline.json", "utf8"));
  const allProductItems = [
    ...baseline.products.map(p => ({
      slug: p.slug,
      name: p.name,
      categorySlug: p.category.slug,
      description: p.description,
      imageUrl: p.imageUrl,
      imageAlt: p.imageAlt
    })),
    ...catalogueCandidates.map(c => ({
      slug: c.slug,
      name: c.name,
      categorySlug: c.categorySlug,
      description: c.description,
      imageUrl: c.imageUrl,
      imageAlt: c.imageAlt
    }))
  ];

  // Deduplicate by slug
  const uniqueProducts = [];
  const seen = new Set();
  for (const item of allProductItems) {
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    uniqueProducts.push(item);
  }

  console.log(`Processing ${uniqueProducts.length} unique products...`);
  let createdCount = 0;
  let updatedCount = 0;

  for (const prod of uniqueProducts) {
    const categoryId = categoryMap.get(prod.categorySlug);
    if (!categoryId) {
      console.warn(`Category not found for slug ${prod.categorySlug}, skipping ${prod.slug}`);
      continue;
    }

    const priceInfo = pricingMap.get(prod.slug) || {
      unit: "each",
      packageQuantity: 1.0,
      sydneyMarketRefPrice: 4.50,
      suggestedFreshStopPrice: 3.99,
      approvedSellingPrice: null,
      priceCents: null,
      compareAtPriceCents: 450,
      unitPriceCents: 399,
      costPrice: 2.50,
      competitorSource: "Sydney Retail Average",
      sourceUrl: "https://www.sydneymarkets.com.au",
      pricingConfidence: "MEDIUM",
      approvalStatus: "PENDING",
      taxCategory: "GST_FREE",
      isPurchasable: false,
      availabilityStatus: "IN_STOCK"
    };

    const isApproved = priceInfo.approvalStatus === "APPROVED";
    const floatPrice = isApproved ? priceInfo.approvedSellingPrice : null;
    const priceCents = isApproved ? priceInfo.priceCents : null;

    const existing = await db.product.findUnique({ where: { slug: prod.slug } });

    const productRecord = await db.product.upsert({
      where: { slug: prod.slug },
      update: {
        name: prod.name,
        categoryId,
        description: prod.description || `Fresh ${prod.name.toLowerCase()} sourced for Sydney households.`,
        imageUrl: prod.imageUrl,
        imageAlt: prod.imageAlt,
        price: floatPrice,
        unit: priceInfo.unit,
        compareAtPrice: priceInfo.sydneyMarketRefPrice,
        priceCents,
        compareAtPriceCents: priceInfo.compareAtPriceCents,
        packageQuantity: priceInfo.packageQuantity,
        unitPriceCents: priceInfo.unitPriceCents,
        stockQuantity: 150,
        availabilityStatus: priceInfo.availabilityStatus || "IN_STOCK",
        isActive: true,
        isPurchasable: isApproved,
        taxCategory: priceInfo.taxCategory || "GST_FREE",
        approvalStatus: priceInfo.approvalStatus || "PENDING",
        costPrice: priceInfo.costPrice,
        marketPrice: priceInfo.sydneyMarketRefPrice,
        marketSource: priceInfo.competitorSource,
        priceConfidence: priceInfo.pricingConfidence || "HIGH",
        priceApprovedAt: isApproved ? new Date() : null,
        priceUpdatedAt: new Date(),
        isPublished: true
      },
      create: {
        name: prod.name,
        slug: prod.slug,
        categoryId,
        description: prod.description || `Fresh ${prod.name.toLowerCase()} sourced for Sydney households.`,
        imageUrl: prod.imageUrl,
        imageAlt: prod.imageAlt,
        price: floatPrice,
        unit: priceInfo.unit,
        compareAtPrice: priceInfo.sydneyMarketRefPrice,
        priceCents,
        compareAtPriceCents: priceInfo.compareAtPriceCents,
        packageQuantity: priceInfo.packageQuantity,
        unitPriceCents: priceInfo.unitPriceCents,
        stockQuantity: 150,
        availabilityStatus: priceInfo.availabilityStatus || "IN_STOCK",
        isActive: true,
        isPurchasable: isApproved,
        taxCategory: priceInfo.taxCategory || "GST_FREE",
        approvalStatus: priceInfo.approvalStatus || "PENDING",
        costPrice: priceInfo.costPrice,
        marketPrice: priceInfo.sydneyMarketRefPrice,
        marketSource: priceInfo.competitorSource,
        priceConfidence: priceInfo.pricingConfidence || "HIGH",
        priceApprovedAt: isApproved ? new Date() : null,
        priceUpdatedAt: new Date(),
        isPublished: true
      }
    });

    if (existing) updatedCount++;
    else createdCount++;

    // Ensure branch inventory
    for (const b of branches) {
      await db.branchInventory.upsert({
        where: { storeBranchId_productId: { storeBranchId: b.id, productId: productRecord.id } },
        update: { isAvailable: true },
        create: { storeBranchId: b.id, productId: productRecord.id, isAvailable: true }
      });
    }

    // Record market price reference
    const existingRef = await db.marketPriceReference.findFirst({
      where: { productId: productRecord.id, competitor: priceInfo.competitorSource }
    });
    if (!existingRef) {
      await db.marketPriceReference.create({
        data: {
          productId: productRecord.id,
          competitor: priceInfo.competitorSource,
          productName: prod.name,
          packSize: priceInfo.unit,
          observedPrice: priceInfo.sydneyMarketRefPrice,
          unitPrice: priceInfo.unitPriceDisplay,
          sourceUrl: priceInfo.sourceUrl,
          notes: `Researched Sydney market reference price: A$${priceInfo.sydneyMarketRefPrice.toFixed(2)}`
        }
      });
    }
  }

  console.log(`Sync finished! Created: ${createdCount}, Updated: ${updatedCount}. Total in DB: ${await db.product.count()}`);
}

main().catch(err => {
  console.error("Sync error:", err);
  process.exit(1);
}).finally(() => db.$disconnect());
