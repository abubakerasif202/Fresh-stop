/** Category tab ordering. Pure so it can be unit-tested; every input category stays reachable. */
export const PRIMARY_CATEGORY_SLUGS = [
  "fruits", "vegetables", "leafy-greens", "herbs", "specialty-produce", "pantry", "frozen", "drinks"
] as const;

/** Tab labels. Slugs that are not listed fall back to the name from the catalogue. */
export const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  fruits: "Fruits",
  vegetables: "Vegetables",
  "leafy-greens": "Leafy Greens",
  herbs: "Herbs",
  "specialty-produce": "Specialty Produce",
  pantry: "Pantry",
  frozen: "Frozen Foods",
  drinks: "Drinks"
};

export interface CategoryLike { name: string; slug: string }
export interface CategoryTab { slug: string; label: string }

export function categoryLabel(category: CategoryLike): string {
  return CATEGORY_LABELS[category.slug] ?? category.name;
}

/** Splits categories into the primary tab row and a "more" row. Nothing is dropped or duplicated. */
export function splitCategories(categories: readonly CategoryLike[]): { primary: CategoryTab[]; more: CategoryTab[] } {
  const bySlug = new Map(categories.map(c => [c.slug, c] as const));
  const primary = PRIMARY_CATEGORY_SLUGS.flatMap(slug => {
    const c = bySlug.get(slug);
    return c ? [{ slug, label: categoryLabel(c) }] : [];
  });
  const primarySet = new Set<string>(PRIMARY_CATEGORY_SLUGS);
  const more = [...bySlug.values()]
    .filter(c => !primarySet.has(c.slug))
    .sort((a, b) => a.name.localeCompare(b.name, "en-AU"))
    .map(c => ({ slug: c.slug, label: categoryLabel(c) }));
  return { primary, more };
}

/** Shareable catalogue URL for a category and/or search term. */
export function productsHref(category?: string, q?: string): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  return `/products${params.size ? `?${params}` : ""}`;
}
