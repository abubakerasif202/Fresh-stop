/** Approved generic food illustrations. These depict no branded packaging or verified stock. */
const illustration = (slug: string, subject: string) => ({
  imageUrl: `/products/ai/${slug}-illustration.webp`,
  imageAlt: `Generic AI-generated ${subject}; not actual packaging.`
});

export const catalogueIllustrations = {
  "antoniou-fillo-pastry": illustration("antoniou-fillo-pastry", "illustration of layered fillo pastry"),
  "baducci-pasta": illustration("baducci-pasta", "pasta illustration"),
  "hecham-chickpeas": illustration("hecham-chickpeas", "chickpea illustration"),
  "hecham-red-lentils": illustration("hecham-red-lentils", "red lentil illustration"),
  "katoomba-combo-selection": illustration("katoomba-combo-selection", "abstract illustration in green and ochre; contents unspecified"),
  "katoomba-punjabi-samosas": illustration("katoomba-punjabi-samosas", "samosa illustration"),
  "parle-g-biscuits": illustration("parle-g-biscuits", "biscuit illustration"),
  "s-w-mayonnaise": illustration("s-w-mayonnaise", "mayonnaise illustration"),
  "saxa-salt": illustration("saxa-salt", "salt illustration"),
  "shan-spice-mixes": illustration("shan-spice-mixes", "abstract powder swirl illustration; ingredients unspecified"),
  "viya-jowar-flour": illustration("viya-jowar-flour", "flour illustration"),
  "wagh-bakri-tea": illustration("wagh-bakri-tea", "tea illustration")
} as const;

export function catalogueIllustration(slug: string) {
  return Object.hasOwn(catalogueIllustrations, slug)
    ? catalogueIllustrations[slug as keyof typeof catalogueIllustrations]
    : undefined;
}

export function isGenericCatalogueIllustration(imageUrl: string) {
  return Object.values(catalogueIllustrations).some(illustration => illustration.imageUrl === imageUrl);
}

export const GENERIC_ILLUSTRATION_DISCLOSURE = "Generic AI-generated food illustration; not actual product or packaging.";
