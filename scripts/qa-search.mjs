import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(path.join(process.env.QA_TOOL_ROOT, "package.json"));
const { chromium } = require("playwright");
const base = process.env.BASE_URL || "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`${base}/products`, { waitUntil: "domcontentloaded" });
  const search = page.getByRole("searchbox", { name: "Search fresh produce", exact: true });
  await search.fill("banana");
  const suggestion = search.locator("..").getByRole("link", { name: "Cavendish Bananas", exact: true });
  await suggestion.waitFor({ state: "visible" });
  await search.press("Escape");
  await suggestion.waitFor({ state: "hidden" });
  await writeFile("artifacts/qa/search-report.json", JSON.stringify({ target: base, checksPassed: 1, checksFailed: 0, check: "Search suggestions appear and Escape dismisses them", writes: 0 }, null, 2));
  console.log("PASS search suggestions appear and Escape dismisses them");
} finally { await browser.close(); }
