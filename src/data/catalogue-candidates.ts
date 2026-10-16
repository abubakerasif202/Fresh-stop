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
  }
] as const;
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
    "imageUrl": "/products/placeholder-produce.webp",
    "imageAlt": "Product photograph not yet available",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "placeholder"
  },
  {
    "slug": "baducci-pasta",
    "name": "Baducci pasta",
    "categorySlug": "pantry",
    "description": "Explore our baducci pasta range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/placeholder-produce.webp",
    "imageAlt": "Product photograph not yet available",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "placeholder"
  },
  {
    "slug": "hecham-red-lentils",
    "name": "Hecham red lentils",
    "categorySlug": "pantry",
    "description": "Explore our hecham red lentils range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/placeholder-produce.webp",
    "imageAlt": "Product photograph not yet available",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "placeholder"
  },
  {
    "slug": "hecham-chickpeas",
    "name": "Hecham chickpeas",
    "categorySlug": "pantry",
    "description": "Explore our hecham chickpeas range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/placeholder-produce.webp",
    "imageAlt": "Product photograph not yet available",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "placeholder"
  },
  {
    "slug": "viya-jowar-flour",
    "name": "Viya jowar flour",
    "categorySlug": "pantry",
    "description": "Explore our viya jowar flour range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/placeholder-produce.webp",
    "imageAlt": "Product photograph not yet available",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "placeholder"
  },
  {
    "slug": "shan-spice-mixes",
    "name": "Shan spice mixes",
    "categorySlug": "pantry",
    "description": "Explore our shan spice mixes range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/placeholder-produce.webp",
    "imageAlt": "Product photograph not yet available",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "placeholder"
  },
  {
    "slug": "wagh-bakri-tea",
    "name": "Wagh Bakri tea",
    "categorySlug": "pantry",
    "description": "Explore our wagh bakri tea range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/placeholder-produce.webp",
    "imageAlt": "Product photograph not yet available",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3900 and IMG_3901"
    ],
    "publicationStatus": "staged",
    "imageKind": "placeholder"
  },
  {
    "slug": "katoomba-punjabi-samosas",
    "name": "Katoomba Punjabi samosas",
    "categorySlug": "frozen",
    "description": "Explore our katoomba punjabi samosas range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/placeholder-produce.webp",
    "imageAlt": "Product photograph not yet available",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3903"
    ],
    "publicationStatus": "staged",
    "imageKind": "placeholder"
  },
  {
    "slug": "katoomba-combo-selection",
    "name": "Katoomba Combo Selection",
    "categorySlug": "frozen",
    "description": "Explore our katoomba combo selection range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/placeholder-produce.webp",
    "imageAlt": "Product photograph not yet available",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3903"
    ],
    "publicationStatus": "staged",
    "imageKind": "placeholder"
  },
  {
    "slug": "antoniou-fillo-pastry",
    "name": "Antoniou Fillo Pastry",
    "categorySlug": "frozen",
    "description": "Explore our antoniou fillo pastry range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/placeholder-produce.webp",
    "imageAlt": "Product photograph not yet available",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3903"
    ],
    "publicationStatus": "staged",
    "imageKind": "placeholder"
  },
  {
    "slug": "saxa-salt",
    "name": "Saxa salt",
    "categorySlug": "condiments",
    "description": "Explore our saxa salt range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/placeholder-produce.webp",
    "imageAlt": "Product photograph not yet available",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3873, IMG_3878"
    ],
    "publicationStatus": "staged",
    "imageKind": "placeholder"
  },
  {
    "slug": "s-w-mayonnaise",
    "name": "S&W mayonnaise",
    "categorySlug": "condiments",
    "description": "Explore our s&w mayonnaise range. Please contact our team for product details and current availability.",
    "imageUrl": "/products/placeholder-produce.webp",
    "imageAlt": "Product photograph not yet available",
    "price": null,
    "unit": null,
    "evidence": [
      "Clearly readable actual packaging IMG_3873, IMG_3878"
    ],
    "publicationStatus": "staged",
    "imageKind": "placeholder"
  }
];
