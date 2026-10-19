import { jsonNoStore } from "@/lib/admin-route";
import { adminErrorResponse, guardAdminMutation, jsonError } from "@/lib/admin-audit";
import { updateProductCommerce } from "@/lib/admin-products";

type Ctx = { params: Promise<{ id: string }> };

/** Stock, availability, purchasable and compare-at flags. Prices are changed only through /api/admin/pricing. */
export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await guardAdminMutation(request);
  if (!guard.ok) return guard.response;
  const { id } = await params;
  if (!id || id.length > 64) return jsonError("Invalid product id.", 400);
  try {
    const { product, autoDisabled } = await updateProductCommerce(id, guard.body, guard.admin);
    return jsonNoStore({ success: true, productId: product.id, isPurchasable: product.isPurchasable, autoDisabledBecause: autoDisabled });
  } catch (error) {
    return adminErrorResponse(error, "Updating product stock settings");
  }
}
