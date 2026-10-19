// Read-only owner-presentation QA. Only the exact read-only cart-refresh POST is allowed.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = (process.env.BASE_URL || "http://localhost:3210").replace(/\/$/, "");
const target = new URL(base);
assert.ok((target.protocol === "http:" && ["localhost", "127.0.0.1"].includes(target.hostname)) || base === "https://fresh-stop.vercel.app", "Only local or the exact authorized public site is allowed");
const toolRequire = process.env.QA_TOOL_ROOT ? createRequire(path.join(process.env.QA_TOOL_ROOT, "package.json")) : createRequire(import.meta.url);
const { chromium } = toolRequire("playwright");
const requireProject = createRequire(path.join(process.cwd(), "package.json"));
const axePath = requireProject.resolve("axe-core");
const out = path.resolve("artifacts/presentation-qa", target.hostname === "fresh-stop.vercel.app" ? "production" : "local");
await mkdir(out, { recursive: true });
const results = [], runtimeErrors = [], networkErrors = [], blockedMutations = [];
const configurationBlocks = [];
function note(name, ok, detail = "") { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${name} ${detail}`); }
const safeUrl = value => { const u = new URL(value); return `${u.origin}${u.pathname}`; };
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 320, height: 900 }, reducedMotion: "reduce" });
await context.route("**/*", async route => {
  const request = route.request();
  const url = new URL(request.url());
  const readOnlyRefresh = request.method() === "POST" && url.origin === target.origin && url.pathname === "/api/cart/refresh";
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && !readOnlyRefresh) {
    blockedMutations.push(`${route.request().method()} ${safeUrl(route.request().url())}`);
    return route.abort("blockedbyclient");
  }
  return route.continue();
});
const page = await context.newPage();
page.on("pageerror", error => runtimeErrors.push(error.message));
page.on("console", message => { if (message.type() === "error" || /hydration|hydrated/i.test(message.text())) runtimeErrors.push(message.text().slice(0, 1500)); });
page.on("response", response => { if (response.status() >= 400) networkErrors.push(`${response.status()} ${safeUrl(response.url())}`); });
page.on("requestfailed", request => { if (request.failure()?.errorText !== "net::ERR_ABORTED") networkErrors.push(`${request.failure()?.errorText} ${safeUrl(request.url())}`); });
async function goto(route) {
  const response = await page.goto(base + route, { waitUntil: "domcontentloaded" });
  assert.equal(response?.status(), 200, `${route} HTTP 200`);
  await page.locator("main").waitFor();
  await page.getByRole("button", { name: /^Open shopping cart/ }).waitFor();
  await page.waitForFunction(() => {
    const button = document.querySelector('button[aria-label^="Open shopping cart"]');
    return button && Object.keys(button).some(key => key.startsWith("__reactProps$") && typeof button[key]?.onClick === "function");
  });
  await page.evaluate(() => document.fonts.ready);
}
async function layout(label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const images = page.locator("main img");
  for (let index = 0; index < await images.count(); index++) await images.nth(index).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll("main img")].every(img => img.complete));
  const broken = await page.locator("main img").evaluateAll(images => images.filter(img => !img.naturalWidth).map(img => new URL(img.src).pathname));
  note(`${label} layout/images`, overflow <= 0 && broken.length === 0, `overflow=${overflow}, broken=${broken.join(",")}`);
  await page.evaluate(() => scrollTo(0, 0));
}
async function axe(label) {
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })));
  note(`${label} WCAG A/AA`, violations.length === 0, JSON.stringify(violations));
}
try {
  const products = new Map();
  for (let number = 1; number <= 8; number++) {
    await goto(`/products${number === 1 ? "" : `?page=${number}`}`);
    const rows = await page.locator("main article").evaluateAll(cards => cards.map(card => ({ name: card.querySelector("h3")?.textContent, href: card.querySelector("h3 a")?.getAttribute("href"), price: /\$\d+\.\d{2}/.test(card.textContent), indicative: /Indicative price/.test(card.textContent), add: !!card.querySelector('button[aria-label^="Add "]') })));
    for (const row of rows) products.set(row.href, row);
    note(`catalogue page ${number} priced cards`, rows.length > 0 && rows.every(row => row.price && row.indicative && row.add), `${rows.length} cards`);
    await layout(`catalogue page ${number} all product images`);
    if (!(await page.getByRole("link", { name: "Next page", exact: true }).count())) break;
  }
  note("172 unique indicative catalogue products", products.size === 172, `${products.size}`);
  const first = [...products.values()][0];
  assert.ok(first?.href && first?.name, "Product available for browser interactions");
  await goto("/products");
  const categoryHref = await page.getByRole("navigation", { name: "Product categories", exact: true }).locator('a[href*="category="]').first().getAttribute("href");
  assert.ok(categoryHref);
  await goto(categoryHref);
  note("category browsing returns products", await page.locator("main article").count() > 0);
  await goto(first.href);
  note("detail displays indicative price and selling unit", /Indicative/i.test(await page.locator("main").innerText()) && /\$\d+\.\d{2}/.test(await page.locator("main").innerText()) && await page.getByRole("button", { name: /^Add / }).count() > 0);
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/products", first.href, "/cart", "/checkout", "/contact"]) {
      await goto(route);
      await layout(`${route} @${width}`);
      if (width === 320 && ["/", "/products", first.href].includes(route)) await axe(`${route} @320`);
      if ([320, 1440].includes(width)) await page.screenshot({ path: path.join(out, `${route.replace(/\W+/g, "_") || "home"}-${width}.png`), fullPage: true, animations: "disabled", caret: "initial" });
    }
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await goto("/products");
  await page.getByRole("searchbox", { name: "Search the product catalogue" }).fill(first.name);
  await Promise.all([page.waitForURL(url => url.searchParams.get("q") === first.name), page.getByRole("button", { name: "Search", exact: true }).click()]);
  await page.locator("main article").first().waitFor();
  note("search returns matching product", (await page.locator("main article").allTextContents()).some(text => text.includes(first.name)));
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("navigation", { name: "Mobile navigation" }).waitFor();
  note("mobile navigation opens", await page.getByRole("button", { name: "Close menu" }).getAttribute("aria-expanded") === "true");
  await page.keyboard.press("Escape");
  await page.getByRole("navigation", { name: "Mobile navigation" }).waitFor({ state: "hidden" });
  note("mobile navigation closes on Escape", await page.getByRole("navigation", { name: "Mobile navigation" }).count() === 0);
  await page.locator("main article").filter({ hasText: first.name }).first().getByRole("button", { name: /^Add / }).click();
  const drawer = page.getByRole("dialog", { name: "Your Fresh Basket" });
  await drawer.waitFor();
  await drawer.getByRole("button", { name: `Increase quantity of ${first.name}`, exact: true }).click();
  await drawer.getByLabel("2 in cart", { exact: true }).waitFor();
  note("drawer quantity increase", true);
  await drawer.getByRole("button", { name: `Decrease quantity of ${first.name}`, exact: true }).click();
  await drawer.getByLabel("1 in cart", { exact: true }).waitFor();
  note("drawer quantity decrease", true);
  await axe("populated drawer @320");
  await page.screenshot({ path: path.join(out, "populated-drawer-320.png"), fullPage: true, caret: "initial" });
  await page.keyboard.press("Escape");
  await goto("/cart");
  await page.getByRole("button", { name: `Increase quantity of ${first.name}`, exact: true }).waitFor();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByLabel("1 in cart", { exact: true }).waitFor();
  note("cart persists across navigation/reload", true);
  const priceText = await page.locator("main li").filter({ hasText: first.name }).locator("p").first().innerText();
  const unitCents = Math.round(Number(priceText.match(/\$([\d,.]+)/)?.[1].replaceAll(",", "")) * 100);
  assert.ok(unitCents > 0);
  await page.getByRole("button", { name: `Increase quantity of ${first.name}`, exact: true }).click();
  await page.getByLabel("2 in cart", { exact: true }).waitFor();
  const total = `$${(unitCents * 2 / 100).toFixed(2)}`;
  note("cart total uses quantity × indicative cents", (await page.getByRole("complementary", { name: "Order summary" }).innerText()).includes(total), total);
  await layout("populated cart @320");
  await axe("populated cart @320");
  await goto("/checkout");
  await page.getByRole("heading", { name: "Your order preview", exact: true }).waitFor();
  note("order preview displays correct total/no payment action", (await page.locator("main").innerText()).includes(`${total} AUD`) && await page.getByRole("button", { name: /pay|stripe|place order/i }).count() === 0);
  await layout("populated checkout @320");
  await axe("populated checkout @320");
  await page.screenshot({ path: path.join(out, "order-preview-320.png"), fullPage: true, caret: "initial" });
  for (const route of ["/admin", "/api/admin/products"]) {
    const response = await context.request.get(base + route);
    if (target.hostname !== "fresh-stop.vercel.app" && response.status() === 503) {
      configurationBlocks.push(`${route}: local production authentication fails closed without shared Redis`);
      note(`${route} fails closed locally`, true, "HTTP 503; authentication verification BLOCKED on local Redis configuration");
    } else note(`${route} rejects unauthenticated access`, response.status() === 401, `HTTP ${response.status()}`);
  }
} catch (error) { note("harness execution", false, String(error)); }
finally {
  note("no payment/order/mutation requests", blockedMutations.length === 0, JSON.stringify(blockedMutations));
  note("no browser runtime errors", runtimeErrors.length === 0, JSON.stringify([...new Set(runtimeErrors)]));
  note("no unexpected HTTP/network errors", networkErrors.length === 0, JSON.stringify([...new Set(networkErrors)]));
  const report = { base, timestamp: new Date().toISOString(), rateLimitBackend: process.env.QA_RATE_LIMIT_BACKEND || "production-shared", safety: "Only the exact same-origin read-only cart-refresh POST allowed; no provider payments, orders, inventory or messages submitted", total: results.length, passed: results.filter(row => row.ok).length, failed: results.filter(row => !row.ok).length, configurationBlocks, results, runtimeErrors: [...new Set(runtimeErrors)], networkErrors: [...new Set(networkErrors)], blockedMutations };
  await writeFile(path.join(out, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(`Report ${path.join(out, "report.json")}`);
  process.exitCode = report.failed ? 1 : 0;
}
