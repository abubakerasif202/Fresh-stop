/** Read-only HTTP regression checks. Run against a running production build. */
import assert from "node:assert/strict";

const base = process.env.BASE_URL || "http://localhost:3100";
const origin = new URL(base);
assert.ok(["http:", "https:"].includes(origin.protocol));
const failures = [];
const checks = [];
async function check(name, run) {
  try { await run(); checks.push(name); }
  catch (error) { failures.push({ name, error: error.message }); }
}
const get = path => fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) });
for (const userAgent of [undefined, ""]) {
  await check(`missing product returns HTTP 404 (${userAgent === undefined ? "default User-Agent" : "empty User-Agent"})`, async () => {
    const response = await fetch(new URL("/products/audit-missing-product-7cf96f7a", origin), {
      ...(userAgent === undefined ? {} : { headers: { "user-agent": userAgent } }),
      signal: AbortSignal.timeout(30000)
    });
    assert.equal(response.status, 404);
  });
}
const response = await get("/api/products?limit=1");
assert.equal(response.status, 200, "Catalogue must be available for HTTP verification");
const [product] = await response.json();
assert.ok(product?.slug, "At least one published product is required");
for (const path of ["/", "/products", `/products/${encodeURIComponent(product.slug)}`]) {
  await check(`${path} metadata is available in the document head`, async () => {
    const response = await get(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
    assert.match(head, /<meta\s+name="description"\s+content="[^"]+"/i);
    assert.match(head, /<link\s+rel="canonical"\s+href="https?:\/\/[^" ]+"/i);
  });
}
console.log(JSON.stringify({ base, readOnly: true, passed: checks, failures }, null, 2));
if (failures.length) process.exitCode = 1;
