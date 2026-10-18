import test from "node:test";
import assert from "node:assert/strict";
import { filterCatalogue, publicCatalogueProduct, usesReviewedSnapshot, getCategories } from "./catalogue-data";
import { catalogueIllustrations } from "../data/catalogue-illustrations";
import { catalogueCandidates } from "../data/catalogue-candidates";
import { PLACEHOLDER_IMAGE } from "./product-commerce";

const base = {id:"one",slug:"carrots",name:"Carrots",description:"Super special offer!",imageUrl:"/products/ai/carrots.webp",imageAlt:"Carrots",category:{id:"veg",name:"Vegetables",slug:"vegetables"}};
test("approved generic illustrations replace only known placeholders without changing product identity", () => {
  assert.equal(Object.keys(catalogueIllustrations).length, 12);
  for (const [slug, illustration] of Object.entries(catalogueIllustrations)) {
    const input = {...base, slug, imageUrl: PLACEHOLDER_IMAGE, imageAlt: "Photo coming soon"};
    const before = structuredClone(input);
    const product = publicCatalogueProduct(input);
    assert.equal(product.imageUrl, `/products/ai/${slug}-illustration.webp`);
    assert.equal(product.imageAlt, illustration.imageAlt);
    assert.match(product.imageAlt!, /Generic AI-generated/);
    assert.match(product.imageAlt!, /not actual packaging/);
    assert.equal(product.imageKind, "ai");
    assert.deepEqual({...product, imageUrl: input.imageUrl, imageAlt: input.imageAlt, imageKind: undefined, source: undefined}, {...input, imageKind: undefined, source: undefined});
    assert.deepEqual(input, before);
    const candidate = catalogueCandidates.find(p => p.slug === slug);
    assert.ok(candidate, slug);
    assert.equal(candidate.imageUrl, product.imageUrl);
    assert.equal(candidate.imageAlt, product.imageAlt);
    assert.equal(candidate.imageKind, "ai-illustration");
    for (const imageUrl of ["/products/owner-photo.webp", "/products/ai/owner-illustration.webp"]) {
      const edited = publicCatalogueProduct({...input, imageUrl, imageAlt: "Owner supplied image"});
      assert.equal(edited.imageUrl, imageUrl);
      assert.equal(edited.imageAlt, "Owner supplied image");
    }
  }
});
test("unknown placeholders remain unchanged, including inherited object property names", () => {
  for (const slug of ["unreviewed-product", "toString", "__proto__"]) {
    const product = publicCatalogueProduct({...base, slug, imageUrl: PLACEHOLDER_IMAGE, imageAlt: "Pending"});
    assert.equal(product.imageUrl, PLACEHOLDER_IMAGE);
    assert.equal(product.imageAlt, "Pending");
    assert.equal(product.imageKind, "placeholder");
  }
});
test("public projection excludes pricing, stock and promotions", () => {
  const product = publicCatalogueProduct({...base, ...{price:4, specialPrice:1, inventory:[{isAvailable:true}], secret:"private"}});
  assert.deepEqual(Object.keys(product).sort(),["id","slug","name","description","imageUrl","imageAlt","category","imageKind","source"].sort());
  assert.equal(product.description,base.description);
  assert.equal(product.imageKind,"ai");
});
test("catalogue search is case insensitive and combines category and bounded results", () => {
  const carrot = publicCatalogueProduct(base);
  const apple = publicCatalogueProduct({...base,id:"two",slug:"apples",name:"Apples",category:{id:"fruit",name:"Fruits",slug:"fruits"}});
  assert.deepEqual(filterCatalogue([carrot,apple],{q:"CARROT"}),[carrot]);
  assert.deepEqual(filterCatalogue([carrot,apple],{category:"fruits",q:"apple"}),[apple]);
  assert.deepEqual(filterCatalogue([carrot,apple],{category:"fruits",q:"carrot"}),[]);
  assert.equal(filterCatalogue([carrot,apple],{limit:1})[0].name,"Apples");
});


test("staff edits remain visible while seeded claims are neutralised", () => {
  const seeded = {...base,slug:"blueberries-125g",name:"Australian Blueberries",description:"Sweet and antioxidant-rich local blueberries."};
  assert.equal(publicCatalogueProduct(seeded).name,"Blueberries");
  assert.equal(publicCatalogueProduct(seeded).description,"Enquire with our team about blueberries.");
  const edited = publicCatalogueProduct({...seeded,name:"Blueberry punnet",description:"Please contact our team about this product."});
  assert.equal(edited.name,"Blueberry punnet");
  assert.equal(edited.description,"Please contact our team about this product.");
});
test("reviewed snapshot excludes empty categories and rejects Vercel production", async () => {
  const previousMode=process.env.CATALOGUE_DATA_SOURCE;
  const previousEnv=process.env.VERCEL_ENV;
  process.env.CATALOGUE_DATA_SOURCE="reviewed-snapshot";
  try {
    delete process.env.VERCEL_ENV;
    assert.ok(!(await getCategories()).some(c => c.slug === "boxes"));
    process.env.VERCEL_ENV="production";
    assert.throws(usesReviewedSnapshot,/cannot be published to production/);
  } finally {
    if(previousMode===undefined) delete process.env.CATALOGUE_DATA_SOURCE; else process.env.CATALOGUE_DATA_SOURCE=previousMode;
    if(previousEnv===undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV=previousEnv;
  }
});
