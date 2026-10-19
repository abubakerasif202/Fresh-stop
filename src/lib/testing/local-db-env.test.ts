import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("database tests reject remote direct URLs and other local databases before connecting", () => {
  const local = "postgresql://fs_dev:fs_dev@localhost:54329/fresh_stop_dev";
  for (const [pooled, direct, allowed] of [
    [local, local, true],
    [local, "postgresql://test:unused@db.example.test:5432/postgres", false],
    [local.replace("fresh_stop_dev", "important_local_database"), local, false],
  ] as const) {
    const result = spawnSync(process.execPath, ["--import", "tsx", "-e", "import('./src/lib/testing/local-db-env.ts')"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: direct },
      encoding: "utf8",
    });
    assert.equal(result.status === 0, allowed);
    if (!allowed) assert.match(result.stderr, /Refusing to run DB tests/);
  }
});
