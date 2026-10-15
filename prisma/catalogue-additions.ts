/**
 * Draft catalogue additions identified from the Riverwood Google Maps review
 * (Fresh_Stop_Riverwood_Products_To_Add.csv). Names are the CSV's exact product names.
 * Prices, units and branch availability are deliberately absent: none are confirmed.
 */
export interface CatalogueAddition {
  name: string;
  slug: string;
  categorySlug: "fruits" | "vegetables";
  /** Positive description of the subject for the image prompt (no text, props or packaging). */
  subject: string;
}

export const CATALOGUE_ADDITIONS: readonly CatalogueAddition[] = [
  { name: "Carrots", slug: "fresh-carrots", categorySlug: "vegetables", subject: "a bunch of fresh whole carrots with leafy green tops, vibrant orange" },
  { name: "Oranges", slug: "fresh-oranges", categorySlug: "fruits", subject: "several whole navel oranges with one cut in half showing the segments" },
  { name: "Pineapple", slug: "fresh-pineapple", categorySlug: "fruits", subject: "one whole ripe pineapple with a green leafy crown" },
  { name: "Rockmelon", slug: "fresh-rockmelon", categorySlug: "fruits", subject: "one whole rockmelon (cantaloupe) with netted rind beside a cut wedge showing orange flesh" },
  { name: "Honeydew melon", slug: "fresh-honeydew-melon", categorySlug: "fruits", subject: "one whole honeydew melon with smooth pale rind beside a cut wedge showing pale green flesh" },
  { name: "Green capsicum", slug: "fresh-green-capsicum", categorySlug: "vegetables", subject: "three glossy whole green capsicums (green bell peppers)" },
  { name: "Red capsicum", slug: "fresh-red-capsicum", categorySlug: "vegetables", subject: "three glossy whole red capsicums (red bell peppers)" },
  { name: "Cucumber", slug: "fresh-cucumber", categorySlug: "vegetables", subject: "three whole long green cucumbers with one sliced into rounds" },
  { name: "Red onion", slug: "fresh-red-onion", categorySlug: "vegetables", subject: "several whole red (purple) onions with papery skins, one cut in half" },
  { name: "Celery", slug: "fresh-celery", categorySlug: "vegetables", subject: "a fresh whole celery bunch with pale green stalks and leafy tops" },
  { name: "White radish (daikon)", slug: "fresh-white-radish-daikon", categorySlug: "vegetables", subject: "three long white daikon radishes with green leafy tops" },
  { name: "Lettuce", slug: "fresh-lettuce", categorySlug: "vegetables", subject: "two whole heads of fresh green leaf lettuce" },
  { name: "Green cabbage", slug: "fresh-green-cabbage", categorySlug: "vegetables", subject: "two whole green cabbage heads, one halved showing the layered interior" },
  { name: "Red cabbage", slug: "fresh-red-cabbage", categorySlug: "vegetables", subject: "two whole red (purple) cabbage heads, one halved showing the layered interior" },
  { name: "Cauliflower", slug: "fresh-cauliflower", categorySlug: "vegetables", subject: "one whole white cauliflower head with its green leaves" }
];

export const IMAGE_STYLE =
  "Ultra-realistic commercial food photography, fresh Australian greengrocer aesthetic, vibrant natural produce colours, soft diffused studio lighting from the upper left, soft realistic shadow, premium cream seamless background, 45-degree camera angle, sharp detail and believable natural texture, clean modern supermarket e-commerce presentation, square composition. No text, no logos, no watermark, no packaging, no hands, no unrelated props.";

export const imagePrompt = (a: CatalogueAddition) => `${a.subject}. ${IMAGE_STYLE}`;
