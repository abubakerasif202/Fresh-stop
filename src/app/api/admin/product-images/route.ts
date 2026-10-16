import { readdir } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/admin-route";

const ALLOWED = /\.(webp|jpe?g|png)$/i;

/** Image library: files shipped in public/products plus any URL already used by a product. */
export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const urls = new Set<string>();
  for (const sub of ["", "ai"]) {
    try {
      for (const f of await readdir(path.join(process.cwd(), "public", "products", sub))) {
        if (ALLOWED.test(f)) urls.add(`/products/${sub ? `${sub}/` : ""}${f}`);
      }
    } catch {
      // Directory unavailable in this runtime; rely on URLs already stored on products.
    }
  }
  if (process.env.CATALOGUE_DATA_SOURCE === "reviewed-snapshot") return jsonNoStore({ images: [...urls].sort(), readOnly: true });
  try {
    for (const p of await db.product.findMany({ select: { imageUrl: true } })) {
      if (p.imageUrl.startsWith("/products/")) urls.add(p.imageUrl);
    }
  } catch {
    // Non-fatal: the file listing above is still useful.
  }
  return jsonNoStore({ images: [...urls].sort() });
}
