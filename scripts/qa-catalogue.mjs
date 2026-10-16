import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(path.join(process.env.QA_TOOL_ROOT, "package.json"));
const { chromium } = require("playwright");
const requireProject = createRequire(path.join(process.cwd(), "package.json"));
const axePath = requireProject.resolve("axe-core");
const base = process.env.BASE_URL || "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Run mutation assertions only against local retired endpoints");
const out = path.resolve("artifacts/catalogue-qa");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox", "--disable-dev-shm-usage"] } : {})
});
const report = { base, checks: [], failures: [], errors: [], images: [], matrix: [], accessibility: [] };
const check = async (name, run) => { try { await run(); report.checks.push(name); } catch (error) { report.failures.push({ name, error: error.message }); } };
try {
  const page = await browser.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  const routes = ["/", "/products", "/wholesale", "/home-delivery", "/stores"];
  for (const route of routes) {
    await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
    await check(`${route} heading`, async () => assert.equal(await page.locator("h1").count(), 1));
    await check(`${route} shopping controls absent`, async () => assert.equal(await page.getByRole("button", { name: /add .+ to cart|checkout|shopping cart|wishlist|place order|pay now/i }).count(), 0));
    await check(`${route} shopping links absent`, async () => assert.equal(await page.locator('a[href="/checkout"], a[href="/orders"], a[href="/account"]').count(), 0));
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator("img").evaluateAll(images => images.forEach(image => { image.loading = "eager"; }));
      await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo({ top: y, behavior: "instant" }); await new Promise(resolve => setTimeout(resolve, 120)); } scrollTo({ top: 0, behavior: "instant" }); });
      await page.waitForFunction(() => scrollY === 0);
      await page.waitForFunction(() => [...document.images].every(image => image.complete), undefined, { timeout: 60000 });
      await page.waitForTimeout(700);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      report.matrix.push({ route, width, scroll });
      await check(`${route} ${width}px overflow`, async () => assert.ok(scroll <= width, `${scroll}px > ${width}px`));
      if ([375, 1440].includes(width)) {
        await page.addScriptTag({ path: axePath });
        const violations = await page.evaluate(async () => {
          const result = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
          return result.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }));
        });
        report.accessibility.push({ route, width, violations });
        await check(`${route} ${width}px accessibility`, async () => assert.deepEqual(violations, []));
      }
      if ([375, 1440].includes(width)) await page.screenshot({ path: path.join(out, `after-${route === "/" ? "home" : route.slice(1)}-${width}.png`), fullPage: true, animations: "disabled" });
    }
    const broken = await page.locator("img").evaluateAll(images => images.filter(img => !img.complete || !img.naturalWidth).map(img => img.currentSrc || img.src));
    report.images.push({ route, broken });
    await check(`${route} images loaded`, async () => assert.deepEqual(broken, []));
  }
  await page.goto(`${base}/products`, { waitUntil: "domcontentloaded" });
  const detail = await page.locator('article a[href^="/products/"]').first().getAttribute("href");
  await check("product detail available", async () => { assert.ok(detail); await page.goto(`${base}${detail}`, { waitUntil: "domcontentloaded" }); assert.equal(await page.locator("h1").count(), 1); assert.ok(await page.getByText("Enquire for details", { exact: true }).count()); });
  await page.goto(`${base}/products?q=banana`, { waitUntil: "domcontentloaded" });
  await check("search filters products", async () => { const names = await page.locator("article h2, article h3").allTextContents(); assert.ok(names.length > 0); assert.ok(names.every(name => /banana/i.test(name))); });
  await page.goto(`${base}/products`, { waitUntil: "domcontentloaded" });
  const category = await page.getByRole("navigation", { name: "Product categories" }).locator('a[href*="category="]').first().getAttribute("href");
  await check("category filter", async () => { assert.ok(category); await page.goto(`${base}${category}`, { waitUntil: "domcontentloaded" }); assert.ok(await page.locator('nav[aria-label="Product categories"] a[aria-current="page"]').count()); });
  await page.goto(`${base}/wholesale`, { waitUntil: "domcontentloaded" });
  await check("wholesale contact links", async () => { assert.ok(await page.locator('a[href="tel:+61423936586"]').count()); assert.ok(await page.locator('a[href^="mailto:info@freshstop.com.au"]').count()); });
  await page.goto(`${base}/home-delivery`, { waitUntil: "domcontentloaded" });
  await check("delivery contact links", async () => { assert.ok(await page.locator('a[href^="https://wa.me/61423936586"]').count()); assert.ok(await page.locator('a[href^="mailto:info@freshstop.com.au"]').count()); });
  await check("admin unauthenticated guard", async () => {
    const response = await page.request.get(`${base}/admin`);
    assert.ok([401, 503].includes(response.status()));
    assert.equal(response.headers()["cache-control"], "no-store");
  });
  for (const endpoint of ["/api/checkout", "/api/orders/lookup", "/api/pickup-slots", "/api/delivery/check"]) for (const method of ["GET", "POST"]) await check(`${method} ${endpoint} retired`, async () => assert.equal((await page.request.fetch(`${base}${endpoint}`, { method })).status(), 410));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await check("reduced motion reveals visible", async () => assert.ok(await page.locator(".reveal").evaluateAll(elements => elements.every(element => getComputedStyle(element).opacity === "1"))));
  await page.keyboard.press("Tab");
  await check("keyboard focus visible", async () => assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), "BODY"));
  await check("mobile menu Escape restores focus", async () => {
    const trigger = page.getByRole("button", { name: "Open menu", exact: true });
    await trigger.click();
    await page.getByRole("navigation", { name: "Mobile navigation", exact: true }).waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  });
  await check("browser runtime errors", async () => assert.deepEqual(report.errors, []));
} finally {
  await browser.close();
  await writeFile(path.join(out, "browser-report.json"), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ passed: report.checks.length, failures: report.failures }, null, 2));
assert.equal(report.failures.length, 0, "Catalogue browser checks failed");
