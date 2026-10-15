export const SORT_OPTIONS = ["newest", "price-asc", "price-desc", "name"] as const;
export type CatalogueSort = typeof SORT_OPTIONS[number];

export function cataloguePrice(product: { price: number; isSpecial?: boolean; specialPrice?: number | null }) {
  return product.isSpecial && product.specialPrice != null && product.specialPrice > 0 ? product.specialPrice : product.price;
}

export function sortCatalogue<T extends { name: string; price: number; isSpecial?: boolean; specialPrice?: number | null }>(products: T[], sort: string | undefined): T[] {
  if (sort === "name") return [...products].sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
  if (sort === "price-asc" || sort === "price-desc") return [...products].sort((a, b) => (cataloguePrice(a) - cataloguePrice(b)) * (sort === "price-desc" ? -1 : 1) || a.name.localeCompare(b.name));
  return products;
}
