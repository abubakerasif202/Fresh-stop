import type { CatalogueProduct, CatalogueStore } from "./catalogue-data";

// Existing seed/baseline link, independently resolved to Fresh Stop Riverwood on 28 October 2026.
const RIVERWOOD_MAPS_LISTING = "https://maps.app.goo.gl/QACdGqVR9zqDeseG9";

export function homepageMapsUrl(stores: CatalogueStore[]): string | undefined {
  const listing = stores.find(store => store.slug === "rockdale" && isMapsBusinessLink(store.googleMapsUrl))
    ?? stores.find(store => isMapsBusinessLink(store.googleMapsUrl));
  return listing?.googleMapsUrl ?? (stores.some(store => store.slug === "riverwood") ? RIVERWOOD_MAPS_LISTING : undefined);
}

/** Only public, approved, purchasable discounts qualify; indicative/demo prices do not. */
export function homepageSpecials(products: CatalogueProduct[]): CatalogueProduct[] {
  return products.filter(product => product.source === "database" && product.approvalStatus === "APPROVED"
    && product.isPurchasable && typeof product.price === "number" && product.price > 0
    && typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price).slice(0, 4);
}

/** Address searches are useful directions but must not be presented as business listings. */
export function isMapsBusinessLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ((url.hostname === "maps.app.goo.gl" && url.pathname.length > 1)
      || (url.hostname === "www.google.com" && url.pathname.startsWith("/maps/place/")));
  } catch { return false; }
}

export function storeOpeningHours(value: string): [string, string][] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    const labels: Record<string, string> = { mon_sat: "Monday–Saturday", sun: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };
    return Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0 && Object.hasOwn(labels, entry[0])).map(([day, hours]) => [labels[day], hours]);
  } catch { return []; }
}
