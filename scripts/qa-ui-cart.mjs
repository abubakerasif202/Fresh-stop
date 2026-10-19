// Cart/checkout UI QA against a LOCAL server with the disposable DB (see scripts/e2e-fixtures.mjs).
// Usage: QA_TOOL_ROOT=<dir with playwright> BASE_URL=http://localhost:3210 node scripts/qa-ui-cart.mjs
// Checkout status and Stripe session creation are MOCKED (no Stripe key exists); catalogue, cart refresh and delivery are real.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(path.join(process.env.QA_TOOL_ROOT, "package.json"));
const { chromium } = require("playwright");
const requireProject = createRequire(path.join(process.cwd(), "package.json"));
const axePath = requireProject.resolve("axe-core");
const base = process.env.BASE_URL || "http://localhost:3210";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "local only");
const out = path.resolve("artifacts/ui-qa");
await mkdir(out, { recursive: true });

const WIDTHS = [320, 375, 768, 1024, 1440];
const results = [];
const problems = [];
const note = (name, ok, detail = "") => { results.push({ name, ok, detail }); if (!ok) problems.push(`${name} ${detail}`); console.log(`${ok ? "PASS" : "FAIL"} ${name} ${detail}`); };

const browser = await chromium.launch();
// The dev server can hot-reload mid-navigation when files change; retry transient aborts.
async function retry(fn) {
  for (let i = 0; ; i += 1) {
    try { return await fn(); } catch (e) { if (i >= 3 || !/ERR_ABORTED|Execution context was destroyed/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 1500)); }
  }
}
const patchGoto = (page) => { const goto = page.goto.bind(page); page.goto = (url, opts) => retry(() => goto(url, opts)); };
async function newPage(width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  patchGoto(page);
  page.consoleErrors = [];
  // Playwright screenshots inject style="caret-color: transparent" into inputs, which React reports as a hydration diff; ignore that artefact only.
  page.on("console", (m) => { const t = m.text(); if (t.startsWith("Failed to load resource")) return;
    if ((m.type() === "error" || (m.type() === "warning" && /hydrat/i.test(t))) && !t.includes("caret-color")) page.consoleErrors.push(t); });
  page.on("pageerror", (e) => page.consoleErrors.push(String(e)));
  page.on("response", (r) => {
    const mocked = /\/api\/checkout\/stripe|\/api\/cart\/refresh/.test(r.url());
    if (r.status() >= 400 && !mocked) page.consoleErrors.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return page;
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const brokenImages = (page) => page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== "lazy").map((i) => i.src));

// 1. Responsive sweep with an item in the cart.
const page = await newPage();
if (process.env.QA_FROM !== "tracking") {
for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of ["/", "/products", "/products/test-apples-1kg", "/cart", "/checkout", "/orders"]) {
    await page.goto(base + route, { waitUntil: "networkidle" });
    const o = await overflow(page);
    const broken = await brokenImages(page);
    note(`responsive ${route} @${width}`, o <= 0 && broken.length === 0, `overflow=${o} broken=${broken.join(",")}`);
    if (width === 320 && ["/", "/products", "/cart", "/checkout"].includes(route)) {
      await page.addScriptTag({ path: axePath });
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map((v) => `${v.id}:${v.nodes.map((n) => n.target.join(" ")).join(",")}`));
      note(`accessibility ${route} @320`, violations.length === 0, violations.join(" | "));
    }
    if ([320, 1440].includes(width)) await page.screenshot({ path: path.join(out, `${route.replace(/\W+/g, "_") || "home"}-${width}.png`), fullPage: true });
  }
}

// 2. Purchasability on the list.
await page.setViewportSize({ width: 390, height: 900 });
await page.goto(`${base}/products?q=TEST`, { waitUntil: "networkidle" });
const card = (name) => page.locator("article", { hasText: name });
note("purchasable shows Add to Cart", await card("TEST Apples 1kg").getByRole("button", { name: /^Add TEST Apples 1kg to cart/ }).count() === 1);
for (const name of ["TEST Pending Price Sourdough", "TEST Approved Price Unknown Stock", "TEST Out Of Stock Bananas"]) {
  const c = card(name).first();
  note(`non-purchasable "${name}" has no Add to Cart and shows Enquire`, await c.getByRole("button", { name: /Add .* to cart/ }).count() === 0 && await c.getByRole("button", { name: /Enquire/ }).count() === 1 && !/\$\d/.test(await c.innerText()));
}
note("unapproved compare-at not shown", !/\$40\.00/.test(await card("TEST Box With UNAPPROVED").first().innerText()));
note("approved was-price shown", /\$4\.00/.test(await card("TEST Milk 2L With Approved").first().innerText()));
note("no Market Ref / In stock / Save claims", !/Market Ref|In Stock|Save \$/i.test(await page.locator("main").innerText()));

// 3. Add, steppers, drawer a11y, persistence, cross-tab.
await card("TEST Apples 1kg").getByRole("button", { name: /^Add TEST Apples 1kg/ }).click();
const dialog = page.getByRole("dialog");
await dialog.waitFor();
await page.setViewportSize({ width: 320, height: 900 });
note("drawer no overflow at320", await overflow(page) <= 0);
await page.screenshot({ path: path.join(out, "cart-drawer-320.png"), fullPage: true });
note("drawer opens with label", await dialog.getByRole("heading", { name: "Your Fresh Basket" }).isVisible());
note("estimate label present", await dialog.getByText("Estimated total — final amount confirmed at checkout").isVisible());
note("no invented $50/$150/$9.99 text", !/\$50|\$150|9\.99|FREE Sydney/.test(await dialog.innerText()));
await dialog.getByRole("button", { name: "Increase quantity of TEST Apples 1kg" }).click();
note("increment to 2", (await dialog.getByLabel("2 in cart").count()) === 1);
const sizes = await dialog.getByRole("button").evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height)));
note("touch targets >= 44px in drawer buttons (icon buttons)", sizes.filter((s) => s < 44).length === 0, `small=${sizes.filter((s) => s < 44).length}`);
await page.keyboard.press("Tab");
const focusInside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
note("focus stays inside drawer on Tab", focusInside);
await page.keyboard.press("Escape");
note("Escape closes drawer", await dialog.count() === 0);
note("focus returns to a page control", await page.evaluate(() => document.activeElement !== document.body), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
note("header count announced/visible", (await page.getByRole("button", { name: /Open shopping cart, 2 items/ }).count()) === 1);
await page.reload({ waitUntil: "networkidle" });
note("cart persists after reload", (await page.getByRole("button", { name: /Open shopping cart, 2 items/ }).count()) === 1);

// cross-tab
const tab2 = await page.context().newPage();
patchGoto(tab2);
await tab2.goto(`${base}/products/test-bananas-1kg`, { waitUntil: "networkidle" });
await tab2.getByRole("button", { name: /^Add 1 × TEST Bananas/ }).click();
await page.waitForTimeout(500);
note("cross-tab sync (storage event)", (await page.getByRole("button", { name: /Open shopping cart, 3 items/ }).count()) === 1);
await tab2.close();

// 4. Product detail quantity controls.
await page.goto(`${base}/products/test-apples-1kg`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Increase quantity of TEST Apples 1kg" }).click();
note("detail page shows in-cart note", await page.getByText(/in your cart/).isVisible());

// 5. Corrupt storage is discarded; tampered image rejected.
await page.evaluate(() => localStorage.setItem("fresh_stop_cart_v2", "{broken"));
await page.reload({ waitUntil: "networkidle" });
note("corrupt storage -> empty cart, no crash", (await page.getByRole("button", { name: /Open shopping cart, 0 items/ }).count()) === 1);
await page.evaluate(() => localStorage.setItem("fresh_stop_cart_v2", JSON.stringify({ version: 2, lines: [{ productId: "x", slug: "x", name: "X", priceCents: 100, quantity: 500, imageUrl: "https://evil.example/a.png" }] })));
await page.goto(`${base}/cart`, { waitUntil: "networkidle" });
note("tampered snapshot clamped (99) and image replaced", /99/.test(await page.locator("main").innerText()) && !(await page.locator('img[src*="evil"]').count()));
note("unknown product flagged unavailable after refresh", await page.getByText(/No longer listed/).first().isVisible());

// 6. Stale price + unavailable via real refresh.
await page.evaluate(async () => {
  const res = await fetch("/api/products?q=TEST%20Apples");
  const [p] = await res.json();
  localStorage.setItem("fresh_stop_cart_v2", JSON.stringify({ version: 2, lines: [
    { productId: p.id, slug: p.slug, name: p.name, unit: "kg", imageUrl: p.imageUrl, priceCents: 100, quantity: 1 }
  ] }));
});
await page.goto(`${base}/cart`, { waitUntil: "networkidle" });
note("stale price banner", await page.getByText(/Price updated: was \$1\.00, now \$4\.50/).isVisible());
note("checkout link blocked? (not blocked for price change)", (await page.getByRole("link", { name: /Proceed to Checkout/ }).getAttribute("aria-disabled")) !== "true");

// 7. Refresh failure (mocked 503) shows warning, does not block.
await page.route("**/api/cart/refresh", (r) => r.fulfill({ status: 503, body: "{}" }));
await page.reload({ waitUntil: "networkidle" });
note("refresh 503 -> warning shown", await page.getByText(/could not check current prices/).isVisible());
await page.unroute("**/api/cart/refresh");

// 8. Checkout closed (real status endpoint says disabled).
await page.goto(`${base}/checkout`, { waitUntil: "networkidle" });
note("checkout closed state (real status)", await page.getByRole("heading", { name: "Online ordering is not open yet" }).isVisible() && await page.getByRole("button", { name: /Pay|Continue to secure payment/ }).count() === 0);
await page.screenshot({ path: path.join(out, "checkout-closed-390.png"), fullPage: true });

// A stalled availability request must reach the closed state after its timeout.
await page.route("**/api/checkout/status**", async (r) => {
  await new Promise((resolve) => setTimeout(resolve, 7500));
  await r.fulfill({ json: { enabled: true } }).catch(() => {});
});
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Online ordering is not open yet" }).waitFor({ timeout: 12000 });
note("checkout status timeout fails closed instead of loading forever", true);
await page.unroute("**/api/checkout/status**");

// 9. Checkout open (MOCKED status + stripe).
let stripeCalls = []; let mode = "ok";
await page.route("**/api/checkout/status**", (r) => r.fulfill({ json: { enabled: true } }));
await page.route("**/api/delivery/check**", (r) => r.fulfill({ json: { eligible: true, message: "We deliver to your area.", deliveryFeeCents: 800, freeDeliveryMinCents: null, minOrderCents: null } }));
await page.route("**/api/checkout/stripe", async (r) => {
  stripeCalls.push(JSON.parse(r.request().postData() ?? "{}"));
  await new Promise((res) => setTimeout(res, 800));
  if (mode === "conflict") return r.fulfill({ status: 409, json: { code: "CONFLICT", conflicts: [{ productId: stripeCalls.at(-1).items[0].productId, reason: "OUT_OF_STOCK" }] } });
  if (mode === "evil") return r.fulfill({ json: { url: "https://evil.example/pay" } });
  if (mode === "503") return r.fulfill({ status: 503, json: { code: "DB_UNAVAILABLE" } });
  return r.fulfill({ json: { url: "https://checkout.stripe.com/c/pay/cs_test_mock", accessToken: null } });
});
await page.route("https://checkout.stripe.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<h1>mock stripe</h1>" }));
await page.goto(`${base}/checkout`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Order summary" }).waitFor();
await page.screenshot({ path: path.join(out, "checkout-open-390.png"), fullPage: true });
await page.getByRole("button", { name: /Continue to secure payment/ }).click();
note("validation errors are accessible", (await page.locator('[aria-invalid="true"]').count()) >= 4 && stripeCalls.length === 0);
await page.getByLabel(/Full name/).fill("Test Person");
await page.getByLabel(/Email address/).fill("test@example.com");
await page.getByLabel(/Australian phone/).fill("0412 345 678");
await page.getByLabel(/Street address/).fill("1 Test Street");
await page.getByLabel(/Suburb/).fill("Rockdale");
await page.getByLabel(/Postcode/).fill("2216");
await page.getByText("We deliver to your area.").waitFor();
await page.setViewportSize({ width: 320, height: 900 });
note("populated checkout no overflow at320", await overflow(page) <= 0);
await page.screenshot({ path: path.join(out, "checkout-open-filled-320.png"), fullPage: true });
// A changed postcode must lose the old eligibility immediately while its replacement request is pending.
await page.route("**/api/delivery/check**", async (r) => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return r.fulfill({ json: { eligible: false, message: "Outside delivery area.", deliveryFeeCents: null, freeDeliveryMinCents: null, minOrderCents: null } });
});
await page.getByLabel(/Postcode/).fill("2999");
await page.getByRole("button", { name: /Continue to secure payment/ }).click();
note("changed postcode cannot reuse prior eligibility", stripeCalls.length === 0 && await page.getByText("Wait for the postcode check to finish.").isVisible());
await page.unroute("**/api/delivery/check**");
await page.route("**/api/delivery/check**", (r) => r.fulfill({ json: { eligible: true, message: "We deliver to your area.", deliveryFeeCents: 800, freeDeliveryMinCents: null, minOrderCents: null } }));
await page.getByLabel(/Postcode/).fill("2216");
await page.getByText("We deliver to your area.").waitFor();
const submit = page.getByRole("button", { name: /Continue to secure payment/ });
mode = "conflict";
await page.evaluate(() => { const b = document.querySelector("button[type=submit]"); b.click(); b.click(); });
await page.getByText(/Some items in your cart changed/).waitFor();
note("409 shows line conflict + single request (double-submit blocked)", stripeCalls.length === 1 && await page.getByText(/TEST Apples 1kg: it is out of stock/).isVisible(), `calls=${stripeCalls.length} body=${(await page.getByRole("alert").allInnerTexts()).join("/")}`);
mode = "evil";
await submit.click(); await page.getByText(/could not start the payment page/).waitFor();
note("non-Stripe redirect URL refused", page.url().startsWith(base));
mode = "503"; stripeCalls = [];
await submit.click(); await page.getByText(/Online payment is not available right now/).waitFor();
const key1 = stripeCalls[0].idempotencyKey;
await submit.click(); await page.waitForFunction(() => true); await page.waitForTimeout(600);
note("idempotency key reused on identical retry", stripeCalls.length === 2 && stripeCalls[1].idempotencyKey === key1, key1.slice(0, 8));
note("payload has no client total, includes expectedPriceCents", !("total" in stripeCalls[0]) && Number.isInteger(stripeCalls[0].items[0].expectedPriceCents));
await submit.waitFor({ state: "visible" });
mode = "ok";
await Promise.all([page.waitForURL("https://checkout.stripe.com/**"), submit.click({ noWaitAfter: true })]);
note("valid Stripe URL redirect followed with null replay accessToken", page.url().startsWith("https://checkout.stripe.com/"));
await page.goto(`${base}/cart`, { waitUntil: "networkidle" });
const cartAfter = await page.evaluate(() => localStorage.getItem("fresh_stop_cart_v2"));
note("cart NOT cleared on redirect", !!cartAfter && JSON.parse(cartAfter).lines.length > 0);
note("accessToken not stored in localStorage", !(await page.evaluate(() => JSON.stringify(localStorage))).includes('"t"'));

}

// Customer tracking: real local TEST order, no Stripe request or payment.
const trackingContext = await browser.newContext({ viewport: { width: 320, height: 900 } });
const tracking = await trackingContext.newPage();
await tracking.goto(base + "/orders#order=FS-TEST-UI-ORDER&t=test-ui-disposable-order-token-2026", { waitUntil: "networkidle" });
await tracking.waitForFunction(() => !window.location.hash);
note("tracking token fragment removed from history", !tracking.url().includes("#"));
await tracking.getByRole("button", { name: "Look Up Order" }).click();
await tracking.getByText("Payment pending", { exact: true }).waitFor();
note("valid customer token returns minimal order", !(await tracking.locator("main").innerText()).includes("test-ui@example.test"));
await tracking.getByLabel("Access Code").fill("invalid-disposable-order-token");
await tracking.getByRole("button", { name: "Look Up Order" }).click();
await tracking.getByText(/No matching order found/i).waitFor();
note("invalid customer access token refused", await tracking.getByText("Payment pending", { exact: true }).count() === 0);
await tracking.goto(base + "/order-confirmation/FS-TEST-UI-ORDER?t=test-ui-disposable-order-token-2026", { waitUntil: "networkidle" });
await tracking.getByRole("heading", { name: "Payment pending", exact: true }).waitFor();
note("confirmation reads database payment state", await overflow(tracking) <= 0 && !(await tracking.locator("main").innerText()).includes("Your payment has been confirmed"));
await tracking.screenshot({ path: path.join(out, "order-confirmation-320.png"), fullPage: true });
await tracking.goto(base + "/order-confirmation/FS-TEST-UI-ORDER", { waitUntil: "networkidle" });
note("confirmation missing token refused", await tracking.getByRole("heading", { name: "Payment pending", exact: true }).count() === 0);
await trackingContext.close();

// 10. Link crawl.
const crawl = await newPage(1024);
const seen = new Set(["/"]); const queue = ["/", "/products", "/cart"];
const dead = [];
while (queue.length && seen.size < 40) {
  const route = queue.shift();
  const res = await crawl.goto(base + route, { waitUntil: "networkidle" });
  if (!res || res.status() >= 400) { dead.push(`${route} ${res?.status()}`); continue; }
  const hrefs = await crawl.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
  for (const h of hrefs) {
    if (!h || !h.startsWith("/") || h.startsWith("//") || h.startsWith("/admin")) continue;
    const clean = h.split("#")[0];
    if (clean && !seen.has(clean) && !clean.includes("?")) { seen.add(clean); queue.push(clean); }
  }
}
note(`internal link crawl (${seen.size} routes)`, dead.length === 0, dead.join(", "));

// 11. Local admin authentication and responsive management routes. All writes below affect TEST fixtures only.
if (process.env.QA_ADMIN_PASSWORD) {
  const adminContext = await browser.newContext({ httpCredentials: { username: process.env.QA_ADMIN_USER || "admin", password: process.env.QA_ADMIN_PASSWORD } });
  const admin = await adminContext.newPage();
  const adminErrors = [];
  admin.on("pageerror", (error) => adminErrors.push(String(error)));
  for (const width of [320, 1440]) {
    await admin.setViewportSize({ width, height: 900 });
    for (const route of ["/admin", "/admin/products", "/admin/pricing", "/admin/orders", "/admin/delivery", "/admin/settings", "/admin/audit"]) {
      const response = await admin.goto(base + route, { waitUntil: "networkidle" });
      note(`admin ${route} @${width}`, response?.status() === 200 && await overflow(admin) <= 0, `status=${response?.status()} overflow=${await overflow(admin)}`);
    }
  }
  await admin.goto(base + "/admin/pricing", { waitUntil: "networkidle" });
  await admin.locator("#pricing-search").fill("TEST Pending Price Sourdough");
  const fixtureRow = admin.locator("li").filter({ has: admin.getByRole("heading", { name: "TEST Pending Price Sourdough", exact: true }) });
  await fixtureRow.getByLabel("Selling price (AUD)").fill("6.25");
  await fixtureRow.getByRole("button", { name: /^Approve price/ }).click();
  const approval = admin.getByRole("dialog", { name: "Approve selling price" });
  note("admin price approval requires explicit confirmation", await approval.isVisible() && (await approval.innerText()).includes("$6.25"));
  const priceSaved = admin.waitForResponse((response) => response.url().endsWith("/api/admin/pricing") && response.request().method() === "PATCH" && response.status() === 200);
  await approval.getByRole("button", { name: "Approve price", exact: true }).click();
  await priceSaved;
  note("admin TEST fixture price approved", true);
  await admin.goto(base + "/admin/products", { waitUntil: "networkidle" });
  await admin.getByRole("button", { name: /TEST Pending Price Sourdough/ }).click();
  note("admin stock verification controls present", await admin.getByLabel("I counted this stock and it is verified").isVisible());
  await admin.goto(base + "/admin/delivery", { waitUntil: "networkidle" });
  const zone = admin.locator("li").filter({ has: admin.getByRole("heading", { name: "TEST UI Delivery Zone", exact: true }) });
  await zone.getByLabel("Delivery fee (AUD)").fill("8.75");
  await zone.getByRole("button", { name: "Save changes", exact: true }).click();
  await zone.getByText("Saved.", { exact: true }).waitFor();
  note("admin TEST zone fee saved", await zone.getByLabel("Delivery fee (AUD)").inputValue() === "8.75");
  await zone.getByRole("button", { name: "Approve zone", exact: true }).click();
  await zone.getByRole("button", { name: "Withdraw approval", exact: true }).waitFor();
  note("admin TEST zone explicitly approved", true);
  await admin.goto(base + "/admin/orders", { waitUntil: "networkidle" });
  note("admin payment review visible", await admin.getByRole("heading", { name: "Payments needing review" }).isVisible());
  await admin.goto(base + "/admin/settings", { waitUntil: "networkidle" });
  note("paid checkout approval protected by confirmation", await admin.getByRole("button", { name: "Approve paid checkout", exact: true }).isDisabled());
  note("admin no runtime errors", adminErrors.length === 0, adminErrors.join(" | "));
  await adminContext.close();
}

// 11. Reduced motion respected (no running animations on cards).
const rm = await browser.newContext({ reducedMotion: "reduce" });
const rp = await rm.newPage();
await rp.goto(`${base}/products`, { waitUntil: "networkidle" });
const running = await rp.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && a.effect?.getTiming().iterations === Infinity).length);
note("reduced motion: no infinite animations on /products", running === 0, `running=${running}`);

for (const p of [page, crawl, rp]) if (p.consoleErrors?.length) note("console errors", false, [...new Set(p.consoleErrors)].slice(0, 5).join(" | "));
note("no console/hydration errors", ![page, crawl, rp].some((p) => p.consoleErrors?.length));
await browser.close();
await writeFile(path.join(out, process.env.QA_FROM ? "report-followup.json" : "report.json"), JSON.stringify({ base, timestamp: new Date().toISOString(), results, problems, stripe: "MOCKED: no Stripe API or real payment invoked" }, null, 2));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
if (problems.length) { console.log("PROBLEMS:\n" + problems.join("\n")); process.exitCode = 1; }
