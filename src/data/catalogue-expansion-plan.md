# Catalogue expansion plan (staged, unverified)

This is a planning range, not a claim of availability. Every new record is `publicationStatus: "staged"`, `price: null`, `unit: null`, evidence `Catalogue-planning range (unverified availability)`, and uses `/products/placeholder-produce.webp` until its image is generated.

Totals: candidates 83 before, 161 after (78 new, 83 untouched). Pending images: 78 (`artifacts/image-generation/new-image-manifest.json`). Audit: `artifacts/catalogue-qa/image-audit.md`.

## Counts per category (candidates file)

| Category | Existing | New | Total |
|---|---|---|---|
| fruits | 4 | 29 | 33 |
| vegetables | 17 | 20 | 37 |
| leafy-greens (new category) | 0 | 10 | 10 |
| herbs (new category) | 0 | 11 | 11 |
| specialty-produce (new category) | 0 | 8 | 8 |
| rice-grains | 9 | 0 | 9 |
| pantry | 23 | 0 | 23 |
| frozen | 15 | 0 | 15 |
| drinks | 3 | 0 | 3 |
| condiments | 12 | 0 | 12 |

Existing category slugs are unchanged. Mushrooms sit under `vegetables` (no separate category).

## Existing products reused (not modified)

- Fruit: Oranges, Pineapple, Rockmelon, Honeydew melon (AI images exist).
- Vegetables: Lettuce, Carrots, Zucchini, Eggplant, Long eggplant, Chillies (green chilli image), Green capsicum, Red capsicum, Potatoes, Okra, Cucumber, Red onion, Celery, White radish (daikon), Green cabbage, Red cabbage, Cauliflower.
- Rice and grains, pantry, frozen, drinks, condiments: all unchanged.
- Baseline (already in `catalogue-baseline.json`, intentionally not re-added): Bravo Apples, Cavendish Bananas, Australian Blueberries, Strawberries, Hass Avocados, Crisp Green Broccoli, Roma Tomatoes.

## Newly staged (78)

- Fruit (29): mandarins, lemons, limes, grapefruit, pears, grapes, raspberries, blackberries, cherries, kiwifruit, mango, papaya (pawpaw), passionfruit, lychee, dragon fruit, guava, coconut, jackfruit, pomegranate, persimmon, watermelon, peaches, nectarines, plums, apricots, figs, dates, quinces, custard apples.
- Vegetables (20): sweet potatoes, brown onions, garlic, beetroot, turnips, parsnips, radishes, Brussels sprouts, asparagus, green beans, snow peas, sugar snap peas, yellow capsicum, red chillies, jalapenos, button / Swiss brown / portobello / oyster / shiitake mushrooms.
- Leafy greens (10): iceberg, cos, butter lettuce, spinach, silverbeet, kale, rocket, watercress, bok choy, choy sum.
- Herbs (11): coriander, parsley, mint, basil, dill, rosemary, thyme, oregano, chives, spring onions, curry leaves.
- Specialty produce (8): pumpkin, butternut pumpkin, bottle gourd, bitter melon, ridge gourd, snake beans, taro, cassava.

## Merged or skipped on purpose

- Papaya and pawpaw: one record, "Papaya (pawpaw)".
- Green chillies: covered by existing "Chillies" (green image); only Red chillies and Jalapenos added.
- Apples, bananas, blueberries, strawberries, broccoli, tomatoes: baseline records exist (Bravo Apples, Cavendish Bananas, Australian Blueberries, Strawberries, Crisp Green Broccoli, Roma Tomatoes), so no new record. A generic "Tomatoes" or other apple/banana varieties were not added.
- Cucumbers, zucchini, eggplant, long eggplant, red onion, red/green cabbage, green/red capsicum, carrots, potatoes, celery, okra, cauliflower, oranges, pineapple, rockmelon, honeydew: already present.
- "Onions" staged as "Brown onions" to separate from "Red onion". Spinach staged fresh; "Frozen spinach" is a separate existing frozen record.
- Synonyms folded into one record each: courgette, aubergine, cantaloupe, cilantro, arugula, chard.

## Needs human verification

- Whether any staged item is actually stocked or sold; all are unverified planning entries.
- Existing "Lettuce" stays in `vegetables` (moving it to `leafy-greens` would change an existing record's category); decide whether to move it.
- Existing "Chillies" image shows green chillies only.
- Baseline items sit in the baseline JSON, so there are no staged records for Roma Tomatoes variants; decide whether a general "Tomatoes" record is wanted.
- Generated images (78) need visual QA for species accuracy (e.g. dragon fruit, custard apples, ridge gourd, bottle gourd, choy sum vs bok choy, shiitake vs portobello).
- Preview mode (`CATALOGUE_DATA_SOURCE=reviewed-snapshot`) lists every staged candidate; placeholders sort last. Production uses the database, so these only publish after an import/review step.

## Flipping a generated image

1. Add the file at `public/products/ai/<slug>.webp` (manifest `targetPath`, strip leading `public`).
2. Add the slug to `GENERATED_IMAGE_SLUGS` in `src/data/catalogue-candidates.ts`. The candidate then gets `imageUrl /products/ai/<slug>.webp`, `imageKind "ai-illustration"` and alt "<Name>, illustrative AI-generated product photograph".
3. Set the manifest entry `status` to `"generated"`.
4. Run `npx tsx scripts/catalogue-image-audit.ts` (lists pending images whose file now exists) and `node --import tsx --test src/data/catalogue-candidates.test.ts` (fails if a flipped image file is missing).
