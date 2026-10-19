import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-route";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const products = await db.product.findMany({
      include: { category: true },
      orderBy: { name: "asc" }
    });

    const headers = [
      "Product ID",
      "Slug",
      "Product Name",
      "Category",
      "Selling Price AUD",
      "Unit",
      "Market Ref Price AUD",
      "Market Source",
      "Cost Price AUD",
      "Tax Category",
      "Approval Status",
      "Is Purchasable",
      "Availability Status"
    ];

    const rows = products.map((p) => [
      `"${p.id}"`,
      `"${p.slug}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category.name}"`,
      p.price !== null ? p.price.toFixed(2) : "",
      `"${p.unit || ""}"`,
      p.marketPrice !== null && p.marketPrice !== undefined ? p.marketPrice.toFixed(2) : "",
      `"${(p.marketSource || "").replace(/"/g, '""')}"`,
      p.costPrice !== null && p.costPrice !== undefined ? p.costPrice.toFixed(2) : "",
      `"${p.taxCategory}"`,
      `"${p.approvalStatus}"`,
      p.isPurchasable ? "true" : "false",
      `"${p.availabilityStatus}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fresh-stop-catalogue-pricing-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (err) {
    console.error("Export CSV error:", err);
    return new Response("Export failed", { status: 500 });
  }
}
