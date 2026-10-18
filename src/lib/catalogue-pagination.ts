export const CATALOGUE_PAGE_SIZE = 24;
export const MAX_CATALOGUE_PAGE = 1_000_000;

/** Accept decimal page numbers only; cap untrusted input before calculating offsets. */
export function parseCataloguePage(value?: string): number {
  const input = value?.trim();
  if (!input || !/^\d+$/.test(input)) return 1;
  const page = Number(input);
  return page >= 1 ? Math.min(page, MAX_CATALOGUE_PAGE) : 1;
}

function boundedPage(page: number): number {
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, MAX_CATALOGUE_PAGE) : 1;
}

export function paginateCatalogue<T>(items: readonly T[], requestedPage = 1) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / CATALOGUE_PAGE_SIZE));
  const page = Math.min(boundedPage(requestedPage), totalPages);
  const offset = (page - 1) * CATALOGUE_PAGE_SIZE;
  return {
    items: items.slice(offset, offset + CATALOGUE_PAGE_SIZE), page, totalPages, total,
    start: total ? offset + 1 : 0, end: Math.min(offset + CATALOGUE_PAGE_SIZE, total)
  };
}

/** Real links preserve the current filters; page1 retains the existing clean catalogue URL. */
export function cataloguePageHref({ category, q, page = 1 }: { category?: string; q?: string; page?: number } = {}): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  const normalizedPage = boundedPage(page);
  if (normalizedPage > 1) params.set("page", String(normalizedPage));
  return `/products${params.size ? `?${params}` : ""}`;
}

/** First, last and adjacent pages keep the pager bounded even for large catalogues. */
export function cataloguePageNumbers(page: number, totalPages: number): number[] {
  return [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter(number => number >= 1 && number <= totalPages).sort((a, b) => a - b);
}
