import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const require = createRequire(path.join(process.env.QA_TOOL_ROOT, "package.json"));
const { chromium } = require("playwright");
const { default: AxeBuilder } = require("@axe-core/playwright");
const base = process.env.BASE_URL || "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = path.resolve("artifacts/qa");
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const errors = [], failed = [], matrix = [], accessibility = [];
const context = await browser.newContext();
const page = await context.newPage();
page.on("pageerror", error => errors.push(error.stack || error.message));
page.on("requestfailed", request => { if (!request.failure()?.errorText.includes("ERR_ABORTED")) failed.push({ url: request.url(), error: request.failure()?.errorText }); });
for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
  console.log(`Checking home at ${width}px`);
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(base, { waitUntil: "load" });
  await page.locator("h1").waitFor();
  for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 750) { await page.evaluate(scrollY => window.scrollTo(0, scrollY), y); await page.waitForTimeout(80); }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
  if ([390, 1440].includes(width)) await page.screenshot({ path: path.join(out, `home-${width}.png`), fullPage: true, animations: "disabled" });
  const overflow = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
  matrix.push({ width, ...overflow });
  if ([390, 1440].includes(width)) {
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    accessibility.push({ page: "home", width, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) });
  }
}
await page.setViewportSize({ width: 390, height: 844 });
for (const route of ["/products", "/stores", "/checkout", "/orders"]) {
  console.log(`Checking responsive route ${route}`);
  await page.goto(`${base}${route}`, { waitUntil: "load" });
  for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    matrix.push({ page: route, width, scroll });
  }
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/products`, { waitUntil: "load" });
await page.getByRole("button", { name: /^Add .+ to cart$/ }).first().click();
await page.getByRole("dialog").waitFor();
await page.getByRole("dialog").getByRole("button", { name: /Increase quantity of/ }).first().click();
await page.screenshot({ path: path.join(out, "cart-390.png"), fullPage: true });
await page.getByRole("button", { name: /Remove .+ from cart/ }).first().click();
const undo = page.getByRole("button", { name: /Undo/i });
await undo.waitFor({ state: "visible" });
await undo.click();
assert.equal(await page.getByRole("dialog").locator('span[aria-live="polite"]').first().innerText(), "2");
await page.getByRole("button", { name: "Close cart drawer" }).click();
await page.reload({ waitUntil: "load" });
await page.getByRole("button", { name: "Shopping cart with 2 items", exact: true }).waitFor({ state: "visible" });
await page.goto(`${base}/checkout`, { waitUntil: "load" });
await page.screenshot({ path: path.join(out, "checkout-390.png"), fullPage: true });
const checkoutAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
accessibility.push({ page: "checkout", width: 390, violations: checkoutAxe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto(base, { waitUntil: "load" });
assert.ok(await page.locator(".reveal").evaluateAll(elements => elements.every(element => {
  const style = getComputedStyle(element);
  return style.opacity === "1" && parseFloat(style.transitionDuration) <= 0.001;
})), "Reduced motion must leave reveal content visible and transitions effectively disabled");
await page.screenshot({ path: path.join(out, "home-reduced-motion-390.png"), fullPage: true });
await page.getByRole("button", { name: "Open menu" }).click();
await page.keyboard.press("Escape");
await page.getByRole("dialog").waitFor({ state: "hidden" });
assert.equal(await page.getByRole("button", { name: "Open menu" }).evaluate(element => element === document.activeElement), true, "Menu Escape must restore trigger focus");
for (const route of ["/orders", "/products/cavendish-bananas"]) {
  await page.goto(`${base}${route}`, { waitUntil: "load" });
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  accessibility.push({ page: route, width: 390, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) });
}
const report = { target: base, matrix, accessibility, reducedMotion: "visible content and effectively disabled transitions passed", menuKeyboard: "Escape closes menu and restores trigger focus", errors, failed };
await writeFile(path.join(out, "browser-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
assert.ok(matrix.every(row => row.scroll <= row.width), "Horizontal overflow detected");
assert.equal(errors.length, 0, "Browser runtime errors detected");
assert.ok(accessibility.every(result => result.violations.length === 0), "Accessibility violations detected");
