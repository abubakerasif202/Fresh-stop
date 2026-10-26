import test from "node:test";
import assert from "node:assert/strict";
import { checkoutReturnBase } from "./checkout-return-base";

const PRODUCTION = "https://www.freshstop.com.au";

test("production deployments return to the configured site URL", () => {
  const base = checkoutReturnBase({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://shop.example.test", VERCEL_BRANCH_URL: "branch.vercel.app" });
  assert.equal(base, "https://shop.example.test");
});

test("falls back to the production domain when nothing is configured", () => {
  assert.equal(checkoutReturnBase({}), PRODUCTION);
});

test("preview deployments return to their own branch URL, never the live site", () => {
  const base = checkoutReturnBase({ VERCEL_ENV: "preview", NEXT_PUBLIC_SITE_URL: PRODUCTION, VERCEL_BRANCH_URL: "fresh-stop-git-branch.vercel.app", VERCEL_URL: "fresh-stop-abc123.vercel.app" });
  assert.equal(base, "https://fresh-stop-git-branch.vercel.app");
});

test("preview deployments fall back to the deployment URL when no branch URL exists", () => {
  assert.equal(checkoutReturnBase({ VERCEL_ENV: "preview", VERCEL_URL: "fresh-stop-abc123.vercel.app" }), "https://fresh-stop-abc123.vercel.app");
});

test("preview without any Vercel URL keeps the configured base", () => {
  assert.equal(checkoutReturnBase({ VERCEL_ENV: "preview", NEXT_PUBLIC_SITE_URL: "https://staging.example.test" }), "https://staging.example.test");
});

test("rejects a host that is not a plain hostname", () => {
  const base = checkoutReturnBase({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "evil.test/path?x=1", NEXT_PUBLIC_SITE_URL: PRODUCTION });
  assert.equal(base, PRODUCTION);
});
