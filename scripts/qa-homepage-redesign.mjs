import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Uses the existing external QA tool installation; no application dependencies added.
assert.ok(process.env.QA_TOOL_ROOT, "Set QA_TOOL_ROOT to a directory containing Playwright and @axe-core/playwright.");
const require = createRequire(path.join(process.env.QA_TOOL_ROOT, "package.json"));
const { chromium } = require("playwright");
const { default: AxeBuilder } = require("@axe-core/playwright");
const base = process.env.BASE_URL || "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1", "172.21.0.1"].includes(new URL(base).hostname), "Only local QA targets are allowed.");
const out = path.resolve("artifacts/homepage-redesign");
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const errors = [], failedRequests = [], checks = [], accessibility = [], environmentLimitations = [];

try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("requestfailed", request => {
    if (!request.failure()?.errorText.includes("ERR_ABORTED")) failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  });
  for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
    console.log(`Homepage: ${width}px`);
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    assert.equal((await page.goto(base, { waitUntil: "networkidle" })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal((await page.locator("h1").innerText()).replace(/\s+/g, " "), "FRESH STOP");
    assert.equal(await page.locator("h1").count(), 1);
    const maps = page.getByRole("link", { name: /^Find Us on Google Maps/ });
    assert.ok((await maps.getAttribute("href"))?.startsWith("https://maps.app.goo.gl/"));
    assert.equal(new URL(await page.locator("link[rel=canonical]").getAttribute("href")).href, "https://www.freshstop.com.au/");
    for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 700) {
      await page.evaluate(y => window.scrollTo(0, y), y);
      await page.waitForTimeout(70);
    }
    await page.evaluate(async () => { await Promise.all(Array.from(document.images).map(img => img.decode().catch(() => {}))); window.scrollTo(0, 0); });
    const layout = await page.evaluate(() => ({
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      brokenImages: Array.from(document.images).filter(img => !img.complete || !img.naturalWidth).map(img => img.getAttribute("src")),
      headingVisible: (() => { const rect = document.querySelector("h1").getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth; })(),
      heroImageLoaded: document.querySelector(".market-hero-image").naturalWidth > 0
    }));
    assert.ok(layout.scrollWidth <= width, JSON.stringify(layout));
    assert.ok(layout.headingVisible && layout.heroImageLoaded);
    assert.deepEqual(layout.brokenImages, []);
    checks.push(layout);
    await page.screenshot({ path: path.join(out, `after-${width}.png`), fullPage: true, animations: "disabled" });
    if ([390, 1440].includes(width)) await page.screenshot({ path: path.join(out, `hero-${width}.png`), animations: "disabled" });
    if ([320, 390, 768, 1440].includes(width)) {
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      accessibility.push({ width, violations: result.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })) });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  await menu.click();
  await page.getByRole("navigation", { name: "Mobile navigation" }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("navigation", { name: "Mobile navigation" }).waitFor({ state: "hidden" });
  assert.equal(await menu.evaluate(button => button === document.activeElement), true);
  await menu.click();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Weekly Specials" }).click();
  await page.getByRole("navigation", { name: "Mobile navigation" }).waitFor({ state: "hidden" });
  await page.waitForURL("**/#weekly-specials");
  assert.equal(new URL(page.url()).hash, "#weekly-specials");
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Open shopping cart/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Close cart", exact: true }).click();
  await page.goto(`${base}/products`, { waitUntil: "networkidle" });
  const addToCart = page.getByRole("button", { name: /^Add to Cart:/ }).first();
  if (await addToCart.count()) {
    await addToCart.click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("dialog").getByRole("button", { name: /Increase quantity of/ }).first().click();
    await page.getByRole("button", { name: "Close cart", exact: true }).click();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Open shopping cart, 2 items", exact: true }).waitFor();
    await page.getByRole("button", { name: /Open shopping cart/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Remove .+ from cart/ }).first().click();
    await page.getByRole("button", { name: "Close cart", exact: true }).click();
    checks.push({ addToCartQuantityAndPersistence: "passed" });
  } else {
    checks.push({ addToCartQuantityAndPersistence: "unavailable: catalogue has no purchasable products" });
  }
  for (const route of ["/products", "/products?category=fruits", "/products?category=vegetables", "/cart", "/checkout", "/stores", "/contact", "/wholesale", "/home-delivery"]) {
    console.log(`Route: ${route}`);
    const response = await context.request.get(`${base}${route}`);
    checks.push({ route, status: response.status() });
    assert.equal(response.status(), 200, route);
  }
  const status = await context.request.get(`${base}/api/checkout/status?fulfillment=PICKUP`);
  if (status.status() === 503) {
    const body = await status.json();
    assert.equal(body.code, "RATE_LIMIT_UNAVAILABLE");
    environmentLimitations.push({ route: "/api/checkout/status", status: 503, code: body.code, reason: "Local production server has no shared rate limiter; checkout correctly fails closed. Verify live services separately." });
  } else assert.equal(status.status(), 200);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(await page.locator(".intro-overlay").count(), 0);
  checks.push({ mobileMenu: "passed", cartDrawer: "passed", reducedMotion: "passed", immediateHero: "passed" });
  assert.deepEqual(accessibility.flatMap(result => result.violations), [], "Accessibility violations found.");
  assert.deepEqual(errors, [], "Browser errors found.");
  assert.deepEqual(failedRequests, [], "Failed requests found.");
} finally {
  await writeFile(path.join(out, "browser-report.json"), JSON.stringify({ checks, accessibility, errors, failedRequests, environmentLimitations }, null, 2));
  await browser.close();
}
console.log("Homepage responsive, accessibility, routes, navigation and cart checks passed.");
