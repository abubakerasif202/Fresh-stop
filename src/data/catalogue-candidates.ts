/** Staged catalogue prepared from user supplied sources. No live database writes or branch-stock claims. */
export interface CatalogueCandidate {
 slug: string; name: string; categorySlug: string; description: string;
 imageUrl: string; imageAlt: string; price: null; unit: null; evidence: string[];
 publicationStatus: "staged"; imageKind: "ai-illustration" | "placeholder";
}
export const catalogueCategories = [
  {
    "slug": "fruits",
    "name": "Fruit",
    "description": "Colourful fruit for everyday browsing."
  },
  {
    "slug": "vegetables",
    "name": "Vegetables",
    "description": "Fresh produce and everyday vegetables."
  },
  {
    "slug": "rice-grains",
    "name": "Rice & grains",
    "description": "Rice, flour and grain essentials."
  },
  {
    "slug": "pantry",
    "name": "Pantry essentials",
    "description": "Pulses, spices, nuts and packaged groceries."
  },
  {
    "slug": "frozen",
    "name": "Frozen foods",
    "description": "Frozen vegetables, pastries and seafood."
  },
  {
    "slug": "drinks",
    "name": "Drinks",
    "description": "Juices, coconut water and bottled drinks."
  },
  {
    "slug": "condiments",
    "name": "Condiments & groceries",
    "description": "Olives, pickles, sauces and pantry favourites."
  },
  {
    "slug": "leafy-greens",
    "name": "Leafy greens",
    "description": "Lettuce, spinach and other leafy greens."
  },
  {
    "slug": "herbs",
    "name": "Herbs",
    "description": "Culinary herbs and spring onions."
  },
  {
    "slug": "specialty-produce",
    "name": "Specialty produce",
    "description": "Pumpkins, gourds and speciality vegetables."
  }
] as const;

/**
 * Catalogue-planning range (unverified availability). Records below are staged only: no price, unit, stock,
 * origin or certification claim. Images are placeholders until a generated file exists.
 *
 * HOW TO FLIP A PENDING IMAGE: once /public/products/ai/<slug>.webp exists (see
 * artifacts/image-generation/new-image-manifest.json, targetPath), add its slug to GENERATED_IMAGE_SLUGS below
 * and set that manifest entry's status to "generated". Candidates in the set switch to the ai-illustration image.
 * Run `npx tsx scripts/catalogue-image-audit.ts` to list manifest files that now exist.
 */
export const GENERATED_IMAGE_SLUGS: ReadonlySet<string> = new Set<string>([
  "mandarins", "lemons", "limes", "grapefruit", "pears", "grapes", "raspberries", "blackberries", "cherries", "kiwifruit", "mango", "papaya-pawpaw", "passionfruit", "lychee", "dragon-fruit", "guava", "coconut", "jackfruit", "pomegranate", "persimmon", "watermelon", "peaches", "nectarines", "plums", "apricots", "figs", "dates", "quinces", "custard-apples", "sweet-potatoes", "brown-onions", "garlic", "beetroot", "turnips", "parsnips", "radishes", "brussels-sprouts", "asparagus", "green-beans", "snow-peas", "sugar-snap-peas", "yellow-capsicum", "red-chillies", "jalapenos", "button-mushrooms", "swiss-brown-mushrooms", "portobello-mushrooms", "oyster-mushrooms", "shiitake-mushrooms", "iceberg-lettuce", "cos-lettuce", "butter-lettuce", "spinach", "silverbeet", "kale", "rocket", "watercress", "bok-choy", "choy-sum", "coriander", "parsley", "mint", "basil", "dill", "rosemary", "thyme", "oregano", "chives", "spring-onions", "curry-leaves", "pumpkin", "butternut-pumpkin", "bottle-gourd", "bitter-melon", "ridge-gourd", "snake-beans", "taro", "cassava"
]);
export const PLACEHOLDER_IMAGE_URL = "/products/placeholder-produce.webp";
const PLANNING_EVIDENCE = "Catalogue-planning range (unverified availability)";

type PlannedProduce = readonly [slug: string, name: string, categorySlug: string];

const PROPER_NOUN_START = /^(Swiss|Brussels)/;
const mentionName = (name: string) => (PROPER_NOUN_START.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1));

export function plannedCandidate([slug, name, categorySlug]: PlannedProduce): CatalogueCandidate {
  const hasImage = GENERATED_IMAGE_SLUGS.has(slug);
  return {
    slug, name, categorySlug,
    description: `Enquire with our team about ${mentionName(name)}.`,
    imageUrl: hasImage ? `/products/ai/${slug}.webp` : PLACEHOLDER_IMAGE_URL,
    imageAlt: hasImage ? `${name}, illustrative AI-generated product photograph` : "Product photograph not yet available",
    price: null, unit: null,
    evidence: [PLANNING_EVIDENCE],
    publicationStatus: "staged",
    imageKind: hasImage ? "ai-illustration" : "placeholder"
  };
}

export const plannedProduce: readonly PlannedProduce[] = [
  // Fruit
  ["mandarins", "Mandarins", "fruits"], ["lemons", "Lemons", "fruits"], ["limes", "Limes", "fruits"],
  ["grapefruit", "Grapefruit", "fruits"], ["pears", "Pears", "fruits"], ["grapes", "Grapes", "fruits"],
  ["raspberries", "Raspberries", "fruits"], ["blackberries", "Blackberries", "fruits"], ["cherries", "Cherries", "fruits"],
  ["kiwifruit", "Kiwifruit", "fruits"], ["mango", "Mango", "fruits"], ["papaya-pawpaw", "Papaya (pawpaw)", "fruits"],
  ["passionfruit", "Passionfruit", "fruits"], ["lychee", "Lychee", "fruits"], ["dragon-fruit", "Dragon fruit", "fruits"],
  ["guava", "Guava", "fruits"], ["coconut", "Coconut", "fruits"], ["jackfruit", "Jackfruit", "fruits"],
  ["pomegranate", "Pomegranate", "fruits"], ["persimmon", "Persimmon", "fruits"], ["watermelon", "Watermelon", "fruits"],
  ["peaches", "Peaches", "fruits"], ["nectarines", "Nectarines", "fruits"], ["plums", "Plums", "fruits"],
  ["apricots", "Apricots", "fruits"], ["figs", "Figs", "fruits"], ["dates", "Dates", "fruits"],
  ["quinces", "Quinces", "fruits"], ["custard-apples", "Custard apples", "fruits"],
  // Vegetables, capsicums and chillies, mushrooms
  ["sweet-potatoes", "Sweet potatoes", "vegetables"], ["brown-onions", "Brown onions", "vegetables"],
  ["garlic", "Garlic", "vegetables"], ["beetroot", "Beetroot", "vegetables"], ["turnips", "Turnips", "vegetables"],
  ["parsnips", "Parsnips", "vegetables"], ["radishes", "Radishes", "vegetables"],
  ["brussels-sprouts", "Brussels sprouts", "vegetables"], ["asparagus", "Asparagus", "vegetables"],
  ["green-beans", "Green beans", "vegetables"], ["snow-peas", "Snow peas", "vegetables"],
  ["sugar-snap-peas", "Sugar snap peas", "vegetables"], ["yellow-capsicum", "Yellow capsicum", "vegetables"],
  ["red-chillies", "Red chillies", "vegetables"], ["jalapenos", "Jalapenos", "vegetables"],
  ["button-mushrooms", "Button mushrooms", "vegetables"], ["swiss-brown-mushrooms", "Swiss brown mushrooms", "vegetables"],
  ["portobello-mushrooms", "Portobello mushrooms", "vegetables"], ["oyster-mushrooms", "Oyster mushrooms", "vegetables"],
  ["shiitake-mushrooms", "Shiitake mushrooms", "vegetables"],
  // Leafy greens
  ["iceberg-lettuce", "Iceberg lettuce", "leafy-greens"], ["cos-lettuce", "Cos lettuce", "leafy-greens"],
  ["butter-lettuce", "Butter lettuce", "leafy-greens"], ["spinach", "Spinach", "leafy-greens"],
  ["silverbeet", "Silverbeet", "leafy-greens"], ["kale", "Kale", "leafy-greens"], ["rocket", "Rocket", "leafy-greens"],
  ["watercress", "Watercress", "leafy-greens"], ["bok-choy", "Bok choy", "leafy-greens"],
  ["choy-sum", "Choy sum", "leafy-greens"],
  // Herbs
  ["coriander", "Coriander", "herbs"], ["parsley", "Parsley", "herbs"], ["mint", "Mint", "herbs"],
  ["basil", "Basil", "herbs"], ["dill", "Dill", "herbs"], ["rosemary", "Rosemary", "herbs"], ["thyme", "Thyme", "herbs"],
  ["oregano", "Oregano", "herbs"], ["chives", "Chives", "herbs"], ["spring-onions", "Spring onions", "herbs"],
  ["curry-leaves", "Curry leaves", "herbs"],
  // Specialty produce
  ["pumpkin", "Pumpkin", "specialty-produce"], ["butternut-pumpkin", "Butternut pumpkin", "specialty-produce"],
  ["bottle-gourd", "Bottle gourd", "specialty-produce"], ["bitter-melon", "Bitter melon", "specialty-produce"],
  ["ridge-gourd", "Ridge gourd", "specialty-produce"], ["snake-beans", "Snake beans", "specialty-produce"],
  ["taro", "Taro", "specialty-produce"], ["cassava", "Cassava", "specialty-produce"]
];

const expansionCandidates: readonly CatalogueCandidate[] = plannedProduce.map(plannedCandidate);

export const catalogueCandidates: readonly CatalogueCandidate[] = [
  {
    "slug": "fresh-oranges",
    "name": "Oranges",
    "categorySlug": "fruits",
    "description": "Explore our oranges range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-oranges.webp",
    "imageAlt": "Illustrative studio photograph of oranges",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue and existing reviewed catalogue additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-pineapple",
    "name": "Pineapple",
    "categorySlug": "fruits",
    "description": "Explore our pineapple range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-pineapple.webp",
    "imageAlt": "Illustrative studio photograph of pineapple",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue and existing reviewed catalogue additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-rockmelon",
    "name": "Rockmelon",
    "categorySlug": "fruits",
    "description": "Explore our rockmelon range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-rockmelon.webp",
    "imageAlt": "Illustrative studio photograph of rockmelon",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue and existing reviewed catalogue additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-honeydew-melon",
    "name": "Honeydew melon",
    "categorySlug": "fruits",
    "description": "Explore our honeydew melon range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-honeydew-melon.webp",
    "imageAlt": "Illustrative studio photograph of honeydew melon",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue and existing reviewed catalogue additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-lettuce",
    "name": "Lettuce",
    "categorySlug": "vegetables",
    "description": "Explore our lettuce range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-lettuce.webp",
    "imageAlt": "Illustrative studio photograph of lettuce",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-carrots",
    "name": "Carrots",
    "categorySlug": "vegetables",
    "description": "Explore our carrots range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-carrots.webp",
    "imageAlt": "Illustrative studio photograph of carrots",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "zucchini",
    "name": "Zucchini",
    "categorySlug": "vegetables",
    "description": "Explore our zucchini range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-zucchini.webp",
    "imageAlt": "AI illustrative studio photograph of zucchini",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "eggplant",
    "name": "Eggplant",
    "categorySlug": "vegetables",
    "description": "Explore our eggplant range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-eggplant.webp",
    "imageAlt": "AI illustrative studio photograph of eggplant",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "long-eggplant",
    "name": "Long eggplant",
    "categorySlug": "vegetables",
    "description": "Explore our long eggplant range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-long-eggplant.webp",
    "imageAlt": "AI illustrative studio photograph of long eggplant",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "chillies",
    "name": "Chillies",
    "categorySlug": "vegetables",
    "description": "Explore our chillies range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-green-chillies.webp",
    "imageAlt": "AI illustrative studio photograph of chillies",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-green-capsicum",
    "name": "Green capsicum",
    "categorySlug": "vegetables",
    "description": "Explore our green capsicum range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-green-capsicum.webp",
    "imageAlt": "Illustrative studio photograph of green capsicum",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-red-capsicum",
    "name": "Red capsicum",
    "categorySlug": "vegetables",
    "description": "Explore our red capsicum range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-red-capsicum.webp",
    "imageAlt": "Illustrative studio photograph of red capsicum",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "potatoes",
    "name": "Potatoes",
    "categorySlug": "vegetables",
    "description": "Explore our potatoes range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-potatoes.webp",
    "imageAlt": "AI illustrative studio photograph of potatoes",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "okra",
    "name": "Okra",
    "categorySlug": "vegetables",
    "description": "Explore our okra range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-okra.webp",
    "imageAlt": "AI illustrative studio photograph of okra",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-cucumber",
    "name": "Cucumber",
    "categorySlug": "vegetables",
    "description": "Explore our cucumber range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-cucumber.webp",
    "imageAlt": "Illustrative studio photograph of cucumber",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-red-onion",
    "name": "Red onion",
    "categorySlug": "vegetables",
    "description": "Explore our red onion range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-red-onion.webp",
    "imageAlt": "Illustrative studio photograph of red onion",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-celery",
    "name": "Celery",
    "categorySlug": "vegetables",
    "description": "Explore our celery range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-celery.webp",
    "imageAlt": "Illustrative studio photograph of celery",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-white-radish-daikon",
    "name": "White radish (daikon)",
    "categorySlug": "vegetables",
    "description": "Explore our white radish (daikon) range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-white-radish-daikon.webp",
    "imageAlt": "Illustrative studio photograph of white radish (daikon)",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-green-cabbage",
    "name": "Green cabbage",
    "categorySlug": "vegetables",
    "description": "Explore our green cabbage range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-green-cabbage.webp",
    "imageAlt": "Illustrative studio photograph of green cabbage",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-red-cabbage",
    "name": "Red cabbage",
    "categorySlug": "vegetables",
    "description": "Explore our red cabbage range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-red-cabbage.webp",
    "imageAlt": "Illustrative studio photograph of red cabbage",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fresh-cauliflower",
    "name": "Cauliflower",
    "categorySlug": "vegetables",
    "description": "Explore our cauliflower range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fresh-cauliflower.webp",
    "imageAlt": "Illustrative studio photograph of cauliflower",
    "price": null,
    "unit": null,
    "evidence": [
      "User supplied produce catalogue, IMG_3908 and IMG_3921; existing reviewed additions"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "basmati-rice",
    "name": "Basmati rice",
    "categorySlug": "rice-grains",
    "description": "Explore our basmati rice range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/basmati-rice.webp",
    "imageAlt": "AI illustrative studio photograph of basmati rice",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900 and IMG_3901; brown rice is user supplied catalogue category"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "brown-rice",
    "name": "Brown rice",
    "categorySlug": "rice-grains",
    "description": "Explore our brown rice range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/brown-rice.webp",
    "imageAlt": "AI illustrative studio photograph of brown rice",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900 and IMG_3901; brown rice is user supplied catalogue category"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "plain-flour",
    "name": "Plain flour",
    "categorySlug": "rice-grains",
    "description": "Explore our plain flour range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/plain-flour.webp",
    "imageAlt": "AI illustrative studio photograph of plain flour",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900 and IMG_3901; brown rice is user supplied catalogue category"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "self-raising-flour",
    "name": "Self raising flour",
    "categorySlug": "rice-grains",
    "description": "Explore our self raising flour range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/self-raising-flour.webp",
    "imageAlt": "AI illustrative studio photograph of self raising flour",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900 and IMG_3901; brown rice is user supplied catalogue category"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "jowar-flour",
    "name": "Jowar flour",
    "categorySlug": "rice-grains",
    "description": "Explore our jowar flour range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/jowar-flour.webp",
    "imageAlt": "AI illustrative studio photograph of jowar flour",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900 and IMG_3901; brown rice is user supplied catalogue category"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "besan-flour",
    "name": "Besan flour",
    "categorySlug": "rice-grains",
    "description": "Explore our besan flour range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/besan-flour.webp",
    "imageAlt": "AI illustrative studio photograph of besan flour",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900 and IMG_3901; brown rice is user supplied catalogue category"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "urad-flour",
    "name": "Urad flour",
    "categorySlug": "rice-grains",
    "description": "Explore our urad flour range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/urad-flour.webp",
    "imageAlt": "AI illustrative studio photograph of urad flour",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900 and IMG_3901; brown rice is user supplied catalogue category"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "poha",
    "name": "Poha",
    "categorySlug": "rice-grains",
    "description": "Explore our poha range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/poha.webp",
    "imageAlt": "AI illustrative studio photograph of poha",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900 and IMG_3901; brown rice is user supplied catalogue category"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "barley",
    "name": "Barley",
    "categorySlug": "rice-grains",
    "description": "Explore our barley range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/barley.webp",
    "imageAlt": "AI illustrative studio photograph of barley",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900 and IMG_3901; brown rice is user supplied catalogue category"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "red-lentils",
    "name": "Red lentils",
    "categorySlug": "pantry",
    "description": "Explore our red lentils range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/red-lentils.webp",
    "imageAlt": "AI illustrative studio photograph of red lentils",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "chickpeas",
    "name": "Chickpeas",
    "categorySlug": "pantry",
    "description": "Explore our chickpeas range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/chickpeas.webp",
    "imageAlt": "AI illustrative studio photograph of chickpeas",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "black-eye-beans",
    "name": "Black eye beans",
    "categorySlug": "pantry",
    "description": "Explore our black eye beans range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/black-eye-beans.webp",
    "imageAlt": "AI illustrative studio photograph of black eye beans",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "mung-beans",
    "name": "Mung beans",
    "categorySlug": "pantry",
    "description": "Explore our mung beans range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/mung-beans.webp",
    "imageAlt": "AI illustrative studio photograph of mung beans",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "kidney-beans",
    "name": "Kidney beans",
    "categorySlug": "pantry",
    "description": "Explore our kidney beans range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/kidney-beans.webp",
    "imageAlt": "AI illustrative studio photograph of kidney beans",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "pasta",
    "name": "Pasta",
    "categorySlug": "pantry",
    "description": "Explore our pasta range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/pasta.webp",
    "imageAlt": "AI illustrative studio photograph of pasta",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "noodles",
    "name": "Noodles",
    "categorySlug": "pantry",
    "description": "Explore our noodles range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/noodles.webp",
    "imageAlt": "AI illustrative studio photograph of noodles",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "cooking-oil",
    "name": "Cooking oil",
    "categorySlug": "pantry",
    "description": "Explore our cooking oil range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/cooking-oil.webp",
    "imageAlt": "AI illustrative studio photograph of cooking oil",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "nuts",
    "name": "Nuts",
    "categorySlug": "pantry",
    "description": "Explore our nuts range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/nuts.webp",
    "imageAlt": "AI illustrative studio photograph of nuts",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "coriander-seeds",
    "name": "Coriander seeds",
    "categorySlug": "pantry",
    "description": "Explore our coriander seeds range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/coriander-seeds.webp",
    "imageAlt": "AI illustrative studio photograph of coriander seeds",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fennel-seeds",
    "name": "Fennel seeds",
    "categorySlug": "pantry",
    "description": "Explore our fennel seeds range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fennel-seeds.webp",
    "imageAlt": "AI illustrative studio photograph of fennel seeds",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "cumin",
    "name": "Cumin",
    "categorySlug": "pantry",
    "description": "Explore our cumin range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/cumin.webp",
    "imageAlt": "AI illustrative studio photograph of cumin",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "turmeric",
    "name": "Turmeric",
    "categorySlug": "pantry",
    "description": "Explore our turmeric range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/turmeric.webp",
    "imageAlt": "AI illustrative studio photograph of turmeric",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "chilli-powder",
    "name": "Chilli powder",
    "categorySlug": "pantry",
    "description": "Explore our chilli powder range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/chilli-powder.webp",
    "imageAlt": "AI illustrative studio photograph of chilli powder",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "spice-mixes",
    "name": "Spice mixes",
    "categorySlug": "pantry",
    "description": "Explore our spice mixes range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/spice-mixes.webp",
    "imageAlt": "AI illustrative studio photograph of spice mixes",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "coffee",
    "name": "Coffee",
    "categorySlug": "pantry",
    "description": "Explore our coffee range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/coffee.webp",
    "imageAlt": "AI illustrative studio photograph of coffee",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3900, IMG_3901, IMG_3902 and supplied category brief"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "paratha",
    "name": "Paratha",
    "categorySlug": "frozen",
    "description": "Explore our paratha range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/plain-paratha.webp",
    "imageAlt": "AI illustrative studio photograph of paratha",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3903 and IMG_3905 shelf labels and packaging"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "samosas",
    "name": "Samosas",
    "categorySlug": "frozen",
    "description": "Explore our samosas range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/punjabi-samosas.webp",
    "imageAlt": "AI illustrative studio photograph of samosas",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3903 and IMG_3905 shelf labels and packaging"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "frozen-mixed-vegetables",
    "name": "Frozen mixed vegetables",
    "categorySlug": "frozen",
    "description": "Explore our frozen mixed vegetables range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/frozen-mixed-vegetables.webp",
    "imageAlt": "AI illustrative studio photograph of frozen mixed vegetables",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3903 and IMG_3905 shelf labels and packaging"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "frozen-peas",
    "name": "Frozen peas",
    "categorySlug": "frozen",
    "description": "Explore our frozen peas range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/frozen-peas.webp",
    "imageAlt": "AI illustrative studio photograph of frozen peas",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3903 and IMG_3905 shelf labels and packaging"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "frozen-okra",
    "name": "Frozen okra",
    "categorySlug": "frozen",
    "description": "Explore our frozen okra range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/frozen-okra.webp",
    "imageAlt": "AI illustrative studio photograph of frozen okra",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3903 and IMG_3905 shelf labels and packaging"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "frozen-spinach",
    "name": "Frozen spinach",
    "categorySlug": "frozen",
    "description": "Explore our frozen spinach range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/frozen-spinach.webp",
    "imageAlt": "AI illustrative studio photograph of frozen spinach",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3903 and IMG_3905 shelf labels and packaging"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "frozen-molokhia",
    "name": "Frozen molokhia",
    "categorySlug": "frozen",
    "description": "Explore our frozen molokhia range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/frozen-molokhia.webp",
    "imageAlt": "AI illustrative studio photograph of frozen molokhia",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3903 and IMG_3905 shelf labels and packaging"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "frozen-prawns",
    "name": "Frozen prawns",
    "categorySlug": "frozen",
    "description": "Explore our frozen prawns range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/frozen-prawns.webp",
    "imageAlt": "AI illustrative studio photograph of frozen prawns",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3903 and IMG_3905 shelf labels and packaging"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "frozen-squid-rings",
    "name": "Frozen squid rings",
    "categorySlug": "frozen",
    "description": "Explore our frozen squid rings range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/frozen-squid-rings.webp",
    "imageAlt": "AI illustrative studio photograph of frozen squid rings",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3903 and IMG_3905 shelf labels and packaging"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fillo-pastry",
    "name": "Fillo pastry",
    "categorySlug": "frozen",
    "description": "Explore our fillo pastry range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fillo-pastry.webp",
    "imageAlt": "AI illustrative studio photograph of fillo pastry",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3903 and IMG_3905 shelf labels and packaging"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "knafeh-dough",
    "name": "Knafeh dough",
    "categorySlug": "frozen",
    "description": "Explore our knafeh dough range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/knafeh-dough.webp",
    "imageAlt": "AI illustrative studio photograph of knafeh dough",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3903 and IMG_3905 shelf labels and packaging"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "frozen-chips",
    "name": "Frozen chips",
    "categorySlug": "frozen",
    "description": "Explore our frozen chips range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/frozen-chips.webp",
    "imageAlt": "AI illustrative studio photograph of frozen chips",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3903 and IMG_3905 shelf labels and packaging"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "fruit-juice",
    "name": "Fruit juice",
    "categorySlug": "drinks",
    "description": "Explore our fruit juice range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/fruit-juice.webp",
    "imageAlt": "AI illustrative studio photograph of fruit juice",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3906 and IMG_3908; supplied drinks catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "coconut-water",
    "name": "Coconut water",
    "categorySlug": "drinks",
    "description": "Explore our coconut water range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/coconut-water.webp",
    "imageAlt": "AI illustrative studio photograph of coconut water",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3906 and IMG_3908; supplied drinks catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "bottled-drinks",
    "name": "Bottled drinks",
    "categorySlug": "drinks",
    "description": "Explore our bottled drinks range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/bottled-drinks.webp",
    "imageAlt": "AI illustrative studio photograph of bottled drinks",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3906 and IMG_3908; supplied drinks catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "green-olives",
    "name": "Green olives",
    "categorySlug": "condiments",
    "description": "Explore our green olives range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/green-olives.webp",
    "imageAlt": "AI illustrative studio photograph of green olives",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3873 through IMG_3882; supplied condiments catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "black-olives",
    "name": "Black olives",
    "categorySlug": "condiments",
    "description": "Explore our black olives range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/black-olives.webp",
    "imageAlt": "AI illustrative studio photograph of black olives",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3873 through IMG_3882; supplied condiments catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "pickles",
    "name": "Pickles",
    "categorySlug": "condiments",
    "description": "Explore our pickles range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/mixed-pickles.webp",
    "imageAlt": "AI illustrative studio photograph of pickles",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3873 through IMG_3882; supplied condiments catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "sauces",
    "name": "Sauces",
    "categorySlug": "condiments",
    "description": "Explore our sauces range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/sauces.webp",
    "imageAlt": "AI illustrative studio photograph of sauces",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3873 through IMG_3882; supplied condiments catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "mayonnaise",
    "name": "Mayonnaise",
    "categorySlug": "condiments",
    "description": "Explore our mayonnaise range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/mayonnaise.webp",
    "imageAlt": "AI illustrative studio photograph of mayonnaise",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3873 through IMG_3882; supplied condiments catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "passata",
    "name": "Passata",
    "categorySlug": "condiments",
    "description": "Explore our passata range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/passata.webp",
    "imageAlt": "AI illustrative studio photograph of passata",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3873 through IMG_3882; supplied condiments catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "canned-tomatoes",
    "name": "Canned tomatoes",
    "categorySlug": "condiments",
    "description": "Explore our canned tomatoes range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/canned-tomatoes.webp",
    "imageAlt": "AI illustrative studio photograph of canned tomatoes",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3873 through IMG_3882; supplied condiments catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "tahini",
    "name": "Tahini",
    "categorySlug": "condiments",
    "description": "Explore our tahini range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/tahini.webp",
    "imageAlt": "AI illustrative studio photograph of tahini",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3873 through IMG_3882; supplied condiments catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "halawa",
    "name": "Halawa",
    "categorySlug": "condiments",
    "description": "Explore our halawa range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/halawa.webp",
    "imageAlt": "AI illustrative studio photograph of halawa",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3873 through IMG_3882; supplied condiments catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "canned-chickpeas",
    "name": "Canned chickpeas",
    "categorySlug": "condiments",
    "description": "Explore our canned chickpeas range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/canned-chickpeas.webp",
    "imageAlt": "AI illustrative studio photograph of canned chickpeas",
    "price": null,
    "unit": null,
    "evidence": [
      "IMG_3873 through IMG_3882; supplied condiments catalogue"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "parle-g-biscuits",
    "name": "Parle-G biscuits",
    "categorySlug": "pantry",
    "description": "Explore our parle-g biscuits range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/parle-g-biscuits-illustration.webp",
    "imageAlt": "Generic AI-generated biscuit illustration; not actual packaging.",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "baducci-pasta",
    "name": "Baducci pasta",
    "categorySlug": "pantry",
    "description": "Explore our baducci pasta range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/baducci-pasta-illustration.webp",
    "imageAlt": "Generic AI-generated pasta illustration; not actual packaging.",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "hecham-red-lentils",
    "name": "Hecham red lentils",
    "categorySlug": "pantry",
    "description": "Explore our hecham red lentils range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/hecham-red-lentils-illustration.webp",
    "imageAlt": "Generic AI-generated red lentil illustration; not actual packaging.",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "hecham-chickpeas",
    "name": "Hecham chickpeas",
    "categorySlug": "pantry",
    "description": "Explore our hecham chickpeas range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/hecham-chickpeas-illustration.webp",
    "imageAlt": "Generic AI-generated chickpea illustration; not actual packaging.",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "viya-jowar-flour",
    "name": "Viya jowar flour",
    "categorySlug": "pantry",
    "description": "Explore our viya jowar flour range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/viya-jowar-flour-illustration.webp",
    "imageAlt": "Generic AI-generated flour illustration; not actual packaging.",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "shan-spice-mixes",
    "name": "Shan spice mixes",
    "categorySlug": "pantry",
    "description": "Explore our shan spice mixes range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/shan-spice-mixes-illustration.webp",
    "imageAlt": "Generic AI-generated abstract powder swirl illustration; ingredients unspecified; not actual packaging.",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "wagh-bakri-tea",
    "name": "Wagh Bakri tea",
    "categorySlug": "pantry",
    "description": "Explore our wagh bakri tea range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/wagh-bakri-tea-illustration.webp",
    "imageAlt": "Generic AI-generated tea illustration; not actual packaging.",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "katoomba-punjabi-samosas",
    "name": "Katoomba Punjabi samosas",
    "categorySlug": "frozen",
    "description": "Explore our katoomba punjabi samosas range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/katoomba-punjabi-samosas-illustration.webp",
    "imageAlt": "Generic AI-generated samosa illustration; not actual packaging.",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3903"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "katoomba-combo-selection",
    "name": "Katoomba Combo Selection",
    "categorySlug": "frozen",
    "description": "Explore our katoomba combo selection range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/katoomba-combo-selection-illustration.webp",
    "imageAlt": "Generic AI-generated abstract illustration in green and ochre; contents unspecified; not actual packaging.",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3903"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "antoniou-fillo-pastry",
    "name": "Antoniou Fillo Pastry",
    "categorySlug": "frozen",
    "description": "Explore our antoniou fillo pastry range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/antoniou-fillo-pastry-illustration.webp",
    "imageAlt": "Generic AI-generated illustration of layered fillo pastry; not actual packaging.",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3903"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "saxa-salt",
    "name": "Saxa salt",
    "categorySlug": "condiments",
    "description": "Explore our saxa salt range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/saxa-salt-illustration.webp",
    "imageAlt": "Generic AI-generated salt illustration; not actual packaging.",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3873, IMG_3878"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  {
    "slug": "s-w-mayonnaise",
    "name": "S&W mayonnaise",
    "categorySlug": "condiments",
    "description": "Explore our s&w mayonnaise range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/ai/s-w-mayonnaise-illustration.webp",
    "imageAlt": "Generic AI-generated mayonnaise illustration; not actual packaging.",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3873, IMG_3878"
    ],
    "publicationStatus": "staged",
    "imageKind": "ai-illustration"
  },
  ...expansionCandidates
];
