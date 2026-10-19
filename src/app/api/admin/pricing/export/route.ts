import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-route";
import { PRICING_CSV_HEADERS, csvRow, marketRefsFor, pricingExportRow } from "@/lib/admin-pricing";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const products = await db.product.findMany({
      include: { category: { select: { name: true } }, marketReferences: true },
      orderBy: { name: "asc" }
    });
    const lines = [csvRow(PRICING_CSV_HEADERS), ...products.map((p) => pricingExportRow(p, marketRefsFor(p, p.marketReferences)))];
    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fresh-stop-pricing-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store"
      }
    });
  } catch {
    console.error("Pricing CSV export failed");
    return new Response("Export failed", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
