/** Read-only Production domain/SEO smoke test. Never submits enquiries or orders. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const primary = new URL(process.env.EXPECTED_SITE_URL || "https://fresh-stop.vercel.app");
const origins = (process.env.QA_ORIGINS || "https://fresh-stop.vercel.app,https://www.freshstop.com.au,https://freshstop.com.au")
  .split(",").map(value => new URL(value.trim()).origin);
const passed = [], failures = [];
const request = url => fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000) });
const decode = value => value.replaceAll("&amp;", "&");
const canonical = html => {
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
  for (const tag of head.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = Object.fromEntries([...tag[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
    if (attributes.rel === "canonical") return attributes.href;
  }
};
async function check(name, run) {
  try { passed.push({ name, ...await run() }); }
  catch (error) { failures.push({ name, error: error.message }); }
}
async function get(origin, path) {
  const url = new URL(path, origin);
  const first = await request(url);
  if (origin === "https://freshstop.com.au") {
    assert.equal(first.status, 308, `Expected the existing apex redirect for ${path}`);
    assert.equal(first.headers.get("location"), new URL(path, "https://www.freshstop.com.au").href);
    await first.body?.cancel();
    return request(new URL(path, "https://www.freshstop.com.au"));
  }
  return first;
}

const productsResponse = await request(new URL("/api/products?limit=1", primary));
assert.equal(productsResponse.status, 200, "The Production catalogue must be available");
const [product] = await productsResponse.json();
assert.ok(product?.slug, "At least one published product is required");
const sitemapResponse = await request(new URL("/sitemap.xml", primary));
assert.equal(sitemapResponse.status, 200);
const sitemapUrls = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decode(match[1]));
const expectedUrls = sitemapUrls(await sitemapResponse.text()).sort();
assert.ok(expectedUrls.length > 0);
assert.equal(new Set(expectedUrls).size, expectedUrls.length, "Sitemap has duplicate URLs");
for (const url of expectedUrls) assert.equal(new URL(url).origin, primary.origin);

await Promise.all(origins.map(async origin => {
  for (const path of ["/", "/products", "/products?page=2", `/products/${encodeURIComponent(product.slug)}`]) {
    await check(`${origin}${path} canonical and indexability`, async () => {
      const response = await get(origin, path);
      assert.equal(response.status, 200);
      assert.doesNotMatch(response.headers.get("x-robots-tag") || "", /noindex/i);
      const html = await response.text();
      const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
      assert.doesNotMatch(head, /<meta[^>]+content="[^"]*noindex/i);
      const href = canonical(html);
      assert.ok(href, "Missing canonical in the document head");
      assert.equal(new URL(href).href, new URL(path, primary).href);
      return { status: response.status, canonical: href };
    });
  }
  await check(`${origin} sitemap consistency`, async () => {
    const response = await get(origin, "/sitemap.xml");
    assert.equal(response.status, 200);
    const urls = sitemapUrls(await response.text()).sort();
    assert.deepEqual(urls, expectedUrls);
    return { count: urls.length };
  });
  await check(`${origin} robots`, async () => {
    const response = await get(origin, "/robots.txt");
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.ok(body.includes(`Sitemap: ${new URL("/sitemap.xml", primary).href}`));
    assert.match(body, /^Allow: \/\s*$/m);
    assert.doesNotMatch(body, /^Disallow: \/\s*$/m);
    return { status: response.status };
  });
  for (const [path, status] of [["/products/audit-missing-product-7cf96f7a",404], ["/api/checkout",410], ["/admin",401], ["/products/CREDITS.md",404], ["/docs/IMAGE_SOURCE_RECORDS.md",404]]) {
    await check(`${origin}${path} returns ${status}`, async () => {
      const response = await get(origin, path);
      assert.equal(response.status, status);
      await response.body?.cancel();
      return { status: response.status };
    });
  }
}));
// Owner-approved generic illustrations must remain labelled and never imply actual packaging.
const illustrations = JSON.parse(readFileSync(new URL("../docs/evidence/generic-food-illustrations.json", import.meta.url), "utf8"));
for (const { slug, imageUrl } of illustrations) {
  await check(`${primary.origin}/products/${slug} generic illustration`, async () => {
    const response = await request(new URL(`/products/${slug}`, primary));
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes("Generic AI-generated food illustration; not actual product or packaging."));
    assert.ok(html.includes(encodeURIComponent(imageUrl)) || html.includes(imageUrl));
    const asset = await request(new URL(imageUrl, primary));
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get("content-type") || "", /^image\/webp/);
    await asset.body?.cancel();
    return { status: response.status, imageUrl };
  });
}
console.log(JSON.stringify({ primary: primary.origin, readOnly: true, checks: passed.length + failures.length, passed, failures }, null, 2));
if (failures.length) process.exitCode = 1;
