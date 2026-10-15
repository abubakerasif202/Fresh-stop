import Link from "next/link";
import { Flame } from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  categories: CategoryOption[];
  categorySlug?: string;
  isSpecialOnly: boolean;
  searchQuery: string;
}

const pillBase =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5";
const pillIdle = "bg-white text-ink ring-1 ring-ink/10 hover:ring-leaf hover:bg-leaf/10";
const pillActive = "bg-forest text-white shadow-soft";

export function ProductFilters({ categories, categorySlug, isSpecialOnly, searchQuery }: ProductFiltersProps) {
  const q = searchQuery ? `q=${encodeURIComponent(searchQuery)}` : "";
  const allHref = q ? `/products?${q}` : "/products";
  const specialHref = `/products?special=true${q ? `&${q}` : ""}`;

  return (
    <nav
      aria-label="Catalogue filters"
      className="-mx-4 mb-8 flex items-center gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      <Link
        href={allHref}
        aria-current={!categorySlug && !isSpecialOnly ? "page" : undefined}
        className={`${pillBase} ${!categorySlug && !isSpecialOnly ? pillActive : pillIdle}`}
      >
        All
      </Link>
      <Link
        href={specialHref}
        aria-current={isSpecialOnly ? "page" : undefined}
        className={`${pillBase} ${isSpecialOnly ? "bg-sun text-ink shadow-soft ring-1 ring-ink/10" : "bg-sun/25 text-ink hover:bg-sun/50"}`}
      >
        <Flame className="h-4 w-4 text-citrus" aria-hidden="true" />
        Weekly Specials
      </Link>
      {categories.map((c) => {
        const active = categorySlug === c.slug;
        return (
          <Link
            key={c.id}
            href={`/products?category=${encodeURIComponent(c.slug)}${q ? `&${q}` : ""}`}
            aria-current={active ? "page" : undefined}
            className={`${pillBase} ${active ? pillActive : pillIdle}`}
          >
            {c.name}
          </Link>
        );
      })}
    </nav>
  );
}
