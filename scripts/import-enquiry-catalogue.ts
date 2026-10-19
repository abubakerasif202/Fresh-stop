/** Approval-gated, insert-only catalogue import. Defaults to an offline plan. */
import { PrismaClient } from '@prisma/client';
import { catalogueCandidates, catalogueCategories } from '../src/data/catalogue-candidates';

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '');
async function main() {
  const apply = process.argv.includes('--apply');
  const audit = process.argv.includes('--audit');
  if (!apply && !audit) {
    console.table(catalogueCandidates.map(({ name, slug, categorySlug }) => ({ name, slug, categorySlug, price: null, action: 'proposed unpublished draft; database audit required' })));
    console.log('Offline dry run only. Use --audit for a read-only duplicate check. No database records changed.');
    return;
  }
  if (apply && process.env.APPROVED_CATALOGUE_IMPORT !== 'fresh-stop-catalogue-reviewed') {
    throw new Error('Database changes require explicit owner approval of the audited plan. Set APPROVED_CATALOGUE_IMPORT only after approval.');
  }
  const db = new PrismaClient();
  try {
    const existing = await db.product.findMany({ select: { name: true, slug: true } });
    const slugs = new Set(existing.map(p => p.slug));
    const names = new Set(existing.map(p => normalise(p.name)));
    const plan = catalogueCandidates.filter(p => !slugs.has(p.slug) && !names.has(normalise(p.name)));
    console.table(catalogueCandidates.map(p => ({ slug: p.slug, name: p.name, action: plan.includes(p) ? 'create unpublished draft' : 'skip existing' })));
    if (!apply) { console.log(`Read-only audit: ${plan.length} proposed additions. No database records changed.`); return; }
    await db.$transaction(async tx => {
      for (const category of catalogueCategories) {
        await tx.category.upsert({ where: { slug: category.slug }, update: {}, create: { ...category } });
      }
      const categories = await tx.category.findMany({ select: { id: true, slug: true } });
      for (const product of plan) {
        const category = categories.find(c => c.slug === product.categorySlug);
        if (!category) throw new Error(`Missing category ${product.categorySlug}`);
        await tx.product.upsert({ where: { slug: product.slug }, update: {}, create: {
          name: product.name, slug: product.slug, description: product.description,
          imageUrl: product.imageUrl, imageAlt: product.imageAlt, categoryId: category.id,
          price: null, unit: null, isPublished: false, isSpecial: false,
          approvalStatus: 'PENDING', isPurchasable: false, stockVerified: false, availabilityStatus: 'UNKNOWN'
        } });
      }
    }, { timeout: 30000 });
    console.log('Approved import complete. New products remain unpublished drafts. No branch inventory, prices, historical orders or existing products changed.');
  } finally { await db.$disconnect(); }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Catalogue import failed'); process.exitCode = 1; });
