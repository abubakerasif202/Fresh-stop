import test from "node:test";
import assert from "node:assert/strict";
import type { CatalogueProduct, CatalogueStore } from "./catalogue-data";
import { homepageMapsUrl, homepageSpecials, storeOpeningHours, isMapsBusinessLink } from "./homepage";

const approved = {
  source: "database", approvalStatus: "APPROVED", isPurchasable: true, price: 3, compareAtPrice: 4
} as CatalogueProduct;

test("homepage specials exclude unapproved, non-purchasable and non-discounted products", () => {
  const rejected: CatalogueProduct[] = [
    { ...approved, source: "asset-review" }, { ...approved, approvalStatus: "PENDING" },
    { ...approved, isPurchasable: false }, { ...approved, price: null },
    { ...approved, price: 0 }, { ...approved, compareAtPrice: null },
    { ...approved, compareAtPrice: 3 }, { ...approved, compareAtPrice: 2 }
  ];
  assert.deepEqual(homepageSpecials([...rejected, approved]), [approved]);
  assert.equal(homepageSpecials(Array.from({ length: 8 }, () => approved)).length, 4);
});

test("business listing links are distinct from address searches and unrelated hosts", () => {
  assert.equal(isMapsBusinessLink("https://maps.app.goo.gl/QACdGqVR9zqDeseG9"), true);
  assert.equal(isMapsBusinessLink("https://www.google.com/maps/place/Fresh+Stop+Riverwood/"), true);
  for (const value of ["javascript:alert(1)", "https://maps.google.com/?q=Rockdale", "https://maps.app.goo.gl.evil.test/place", "http://maps.app.goo.gl/example", ""]) {
    assert.equal(isMapsBusinessLink(value), false);
  }
});

test("hero uses the verified Riverwood listing with older address-only records, only for an active branch", () => {
  const riverwood = { slug: "riverwood", googleMapsUrl: "https://maps.google.com/?q=319+Belmore+Rd" } as CatalogueStore;
  const rockdale = { slug: "rockdale", googleMapsUrl: "https://maps.google.com/?q=King+Street" } as CatalogueStore;
  assert.equal(homepageMapsUrl([rockdale, riverwood]), "https://maps.app.goo.gl/QACdGqVR9zqDeseG9");
  assert.equal(homepageMapsUrl([rockdale]), undefined);
  assert.equal(homepageMapsUrl([]), undefined);
  const listedRockdale = { ...rockdale, googleMapsUrl: "https://www.google.com/maps/place/Fresh+Stop+Rockdale/" };
  assert.equal(homepageMapsUrl([riverwood, listedRockdale]), listedRockdale.googleMapsUrl);
});

test("store hours render only supported day labels with non-empty text", () => {
  assert.deepEqual(storeOpeningHours('{"mon_sat":"7 AM – 7 PM","sun":"8 AM – 6 PM","extra":"ignore","monday":null,"tuesday":" "}'), [["Monday–Saturday", "7 AM – 7 PM"], ["Sunday", "8 AM – 6 PM"]]);
  for (const value of ["not-json", "null", "[]", "{}", '{"mon_sat":123,"constructor":"ignore","__proto__":"ignore"}']) assert.deepEqual(storeOpeningHours(value), []);
});
