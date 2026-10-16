import Link from "next/link";
import { CategoryTabs } from "./CategoryTabs";
import { productsHref, splitCategories } from "./category-order";
import "@/styles/catalogue-motion.css";

interface ProductFiltersProps {
  categories: { name: string; slug: string }[];
  categorySlug?: string;
  searchQuery: string;
}

/** Server-rendered category navigation: real links, so it works without JavaScript and URLs stay shareable. */
export function ProductFilters({ categories, categorySlug, searchQuery }: ProductFiltersProps) {
  const { primary, more } = splitCategories(categories);
  const tabs = [
    { key: "all", label: "All products", href: productsHref(undefined, searchQuery) },
    ...primary.map(t => ({ key: t.slug, label: t.label, href: productsHref(t.slug, searchQuery) }))
  ];
  const inTabs = !categorySlug || primary.some(t => t.slug === categorySlug);
  const activeKey = !categorySlug ? "all" : inTabs ? categorySlug : "";
  return (
    <nav aria-label="Product categories" className="mb-8">
      <CategoryTabs tabs={tabs} activeKey={activeKey} />
      {more.length > 0 && (
        <div className="cat-more">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink/70">More</span>
          {more.map(t => (
            <Link key={t.slug} href={productsHref(t.slug, searchQuery)} aria-current={categorySlug === t.slug ? "page" : undefined} className="cat-chip">{t.label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
