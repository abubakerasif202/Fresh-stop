import { db } from "@/lib/db";
import { AdminHttpError, adminErrorResponse, guardAdminMutation, recordAudit } from "@/lib/admin-audit";
import { jsonNoStore } from "@/lib/admin-route";
import { parsePricingCsv } from "@/lib/admin-pricing-import";

export const maxDuration = 60;

export async function POST(request: Request) {
  const guard = await guardAdminMutation(request, 250_000);
  if (!guard.ok) return guard.response;
  try {
    let items;
    try { items = parsePricingCsv(guard.body.csv); }
    catch (error) { throw new AdminHttpError(422, error instanceof Error ? error.message : "Invalid CSV."); }
    const commit = guard.body.confirmation === `SAVE ${items.length} DRAFT PRICES`;
    if (guard.body.confirmation !== undefined && !commit) throw new AdminHttpError(422, "Confirmation does not match the number of draft prices.");
    const result = await db.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { slug: { in: items.map((i) => i.slug) } } });
      const bySlug = new Map(products.map((p) => [p.slug, p]));
      const missing = items.filter((i) => !bySlug.has(i.slug));
      if (missing.length) throw new AdminHttpError(422, `Unknown product slug: ${missing[0].slug}. Nothing was saved.`);
      const rows = items.map((i) => { const p = bySlug.get(i.slug)!; return { ...i, name: p.name, unit: p.unit, previousPriceCents: p.suggestedPriceCents }; });
      if (commit) for (const item of items) {
        const before = bySlug.get(item.slug)!;
        const updated = await tx.product.updateMany({ where: { id: before.id, updatedAt: before.updatedAt }, data: { suggestedPriceCents: item.priceCents } });
        if (updated.count !== 1) throw new AdminHttpError(409, "A product changed. Preview the CSV again before saving.");
        await recordAudit(tx, { action: "DRAFT_PRICE_IMPORTED", entityType: "Product", entityId: before.id, admin: guard.admin,
          before: { suggestedPriceCents: before.suggestedPriceCents }, after: { suggestedPriceCents: item.priceCents }, details: "CSV import; selling-price approval and inventory unchanged" });
      }
      return rows;
    }, { timeout: 30_000 });
    return jsonNoStore({ saved: commit, items: result });
  } catch (error) { return adminErrorResponse(error, "Importing draft prices"); }
}
