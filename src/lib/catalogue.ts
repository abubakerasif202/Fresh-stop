import { effectivePrice } from "./product-commerce";

export const SORT_OPTIONS = ["newest", "price-asc", "price-desc", "name"] as const;
export type CatalogueSort = typeof SORT_OPTIONS[number];

type Priced = { name: string; price: number | null; isSpecial?: boolean; specialPrice?: number | null };

/** Display price, or null when the product has no confirmed price. */
export function cataloguePrice(product: Pick<Priced, "price" | "isSpecial" | "specialPrice">): number | null {
  return effectivePrice(product);
}

const byName = (a: Priced, b: Priced) => a.name.localeCompare(b.name, "en-AU");

/** Price sorts keep unpriced ("Price available in store") products last in both directions. */
export function sortCatalogue<T extends Priced>(products: T[], sort: string | undefined): T[] {
  if (sort === "name") return [...products].sort(byName);
  if (sort === "price-asc" || sort === "price-desc") {
    const dir = sort === "price-desc" ? -1 : 1;
    return [...products].sort((a, b) => {
      const pa = cataloguePrice(a);
      const pb = cataloguePrice(b);
      if (pa === null && pb === null) return byName(a, b);
      if (pa === null) return 1;
      if (pb === null) return -1;
      return (pa - pb) * dir || byName(a, b);
    });
  }
  return products;
}
