import Link from "next/link";

interface ProductFiltersProps {
  categories: { name: string; slug: string }[];
  categorySlug?: string;
  searchQuery: string;
}
export function ProductFilters({ categories, categorySlug, searchQuery }: ProductFiltersProps) {
  function href(slug?: string) {
    const params = new URLSearchParams();
    if (slug) params.set("category", slug);
    if (searchQuery) params.set("q", searchQuery);
    return `/products${params.size ? `?${params}` : ""}`;
  }
  const pill = "inline-flex min-h-11 shrink-0 items-center rounded-full border px-5 py-2.5 text-sm font-bold transition-colors";
  return <nav aria-label="Product categories" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
    <Link href={href()} aria-current={!categorySlug ? "page" : undefined} className={`${pill} ${!categorySlug ? "border-forest bg-forest text-white" : "border-forest/15 bg-white text-forest hover:bg-leaf/10"}`}>All products</Link>
    {categories.map(category => <Link key={category.slug} href={href(category.slug)} aria-current={categorySlug === category.slug ? "page" : undefined} className={`${pill} ${categorySlug === category.slug ? "border-forest bg-forest text-white" : "border-forest/15 bg-white text-forest hover:bg-leaf/10"}`}>{category.name}</Link>)}
  </nav>;
}
