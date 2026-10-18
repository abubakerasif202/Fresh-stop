# Current audit correction — 18 October 2026

The historical narrative below describes the earlier 83-candidate review. Current offline source: 161 candidates, 171 combined public Preview products, 11 active categories, 149 AI candidate images, 12 branded placeholders and 10 baseline image paths. See regenerated product-image-manifest.json and catalogue-import-plan.json. The earlier contact sheet is a 71-image subset, not the complete present range. The 78 later planning additions have image files, but file presence does not imply stock approval or visual/provenance certification.

The earlier claim that the available integration database schema already supported nullable price/unit and publication flags was incorrect. The 18 October read-only integration metadata check found missing Product.imageAlt/isPublished/index and NOT NULL price/unit. The Prisma source supports these features, but available integration schema does not yet. The owner subsequently approved the additive compatibility SQL: applied with a private schema backup and unchanged existing-record digests; no catalogue import has been performed. Proposed compatibility SQL is in production-schema-upgrade.sql. Existing baseline images have not received independent provenance confirmation.

The downloaded range guide now contains all 171 review entries and explicitly says proposals are not confirmed stock. Zero restricted original shop photographs are public.

---

# Supplied asset and catalogue evidence

Audit date: 16 October 2026. This is a staged catalogue proposal, not a stock or pricing record. No live database records were changed.

## Full source inventory and treatment

All 32 supplied images were visually reviewed together in ignored `artifacts/internal-review/supplied-assets-contact-sheet.jpg` (internal audit contact sheet). The 19 original shop photographs and their optimised derivatives are INTERNAL REVIEW ONLY by explicit owner instruction. Zero shop photographs are incorporated publicly. Derivatives and their source manifest are under ignored `artifacts/internal-review/`; public `storePhotos` is empty. IMG_3921 was cropped to the actual shop image, removing phone status, close/share controls and social attribution UI. No branch assignment was inferred. Original shelf labels remain historical photographic details, not current quoted prices.

The owner explicitly restricted all shop photographs to INTERNAL REVIEW ONLY. No shop image, derivative, or contact sheet containing them may be committed or deployed. No independent copyright/licence verification is claimed. No external image was downloaded. Product identification evidence references source filenames only.

Brand: approved `primary-logo.png` and `monochrome-logo.png` were converted with alpha preserved to `/brand/fresh-stop-primary.webp` and `/brand/fresh-stop-monochrome.webp`. Horizontal logo and UI kit are references only. Existing favicon/social variants remain handled by the main implementation.

The four catalogue illustrations (fresh produce; pantry and dry goods; frozen/chilled/drinks; condiments/essentials) were reviewed as category references. They contain rendered product packaging and unverified promotional/footer wording. Original brochures are therefore retained internally under `assets/supplied/02-catalogue/`, not published or extracted into fake branded product photographs. Their generic category suggestions are identified as supplied catalogue evidence. The five desktop/mobile/cart/product mockups remain internal references only, because they show fictional prices, promotions and shopping controls.

## Catalogue discovery

`src/data/catalogue-candidates.ts` prepares 83 additions across fruit, vegetables, rice/grains, pantry, frozen foods, drinks and condiments. Each entry contains source evidence, null price/unit, staged publication status and image type. Generic bananas were excluded because the audited database already has Cavendish Bananas. All 15 existing AI product images were visually reviewed and match their subjects; they use cream studio backgrounds. `docs/evidence/product-images-contact-sheet.jpg` shows all 71 approved AI product images: 15 existing plus 56 newly generated. An earlier progress count of 16 referred to the first batch only; 40 more generic product images were generated in later batches, bringing the new-image total to 56. The 16-image batch covered zucchini, eggplant, long eggplant, green chillies, potatoes, okra, basmati rice, brown rice, jowar flour, red lentils, chickpeas, paratha, samosas, peas, olives and pickles. All are mapped only to corresponding generic candidates. The new produce hero is `/images/produce-hero.webp` and is counted separately from product photos. Brand-specific entries retain placeholders pending legitimate packaging photography.

Readable brands retained only from real packaging: Parle-G, Baducci, Hecham, Viya, Shan, Wagh Bakri, Katoomba, Antoniou, Saxa and S&W. Branded entries use a clearly identified placeholder pending licensed product photography; no label reconstruction or generated packshot. Broad generic varieties from the supplied catalogue/brief are proposals requiring business catalogue review. No brand, package size, certification, origin or ingredient claim has been inferred. No quantity, branch inventory or guaranteed availability is assigned.

## Database and import

The primary audit found 11 published products, five categories and two active stores through read-only access. Exact non-sensitive baseline is in `src/data/catalogue-baseline.json`. Existing `prisma/catalogue-additions.ts` holds 15 earlier produce drafts. The schema already supports nullable prices/units and unpublished products; orders and inventory are preserved.

`scripts/import-enquiry-catalogue.ts` defaults to an offline plan. `--audit` reads database names/slugs and prints duplicate decisions without writing. `--apply` refuses to run unless `APPROVED_CATALOGUE_IMPORT=fresh-stop-catalogue-reviewed` is explicitly set after owner approval. Approved imports insert only missing categories and unpublished products; existing rows are never updated, and no branch inventory or orders are touched. No apply command has been run. Staff can review and publish approved drafts using protected product management after the data change is authorised.

## Final validation and remaining photography

Offline import dry run (`npx tsx scripts/import-enquiry-catalogue.ts`) passed and wrote no records. All 83 candidate slugs are unique and all image paths exist. No exact or equivalent generic candidate duplicates remain against the 11-product baseline (generic bananas were removed; eggs/milk are not repeated). There are 71 candidates using AI illustration and 12 using an honest placeholder, all branded subjects awaiting legitimate packshots. All 40 remaining generic subjects now have generated photographs. Pending branded packshots: Parle-G biscuits; Baducci pasta; Hecham red lentils; Hecham chickpeas; Viya jowar flour; Shan spice mixes; Wagh Bakri tea; Katoomba Punjabi samosas; Katoomba Combo Selection; Antoniou Fillo Pastry; Saxa salt; S&W mayonnaise. No product packaging has been generated. The final image inventory is 56 new product images, 15 reused AI product images and one newly generated hero.

`public/catalogues/fresh-stop-range.txt` is a clean text range guide containing all 93 public Preview products (83 staged additions and 10 neutral-title baseline records; mixed box excluded). It includes an explicit review/availability caveat, actual enquiry contacts and no price, invented promotion, stock promise or rendered brand imagery. The four supplied catalogue graphics remain internal.


`docs/catalogue-import-plan.json` records the 11-row read-only audit baseline, 83 proposed additions, zero duplicate additions, 93 Preview records, imagery and pending packshots. It is review-only and records zero database writes. No original shop photograph or derivative is public.
