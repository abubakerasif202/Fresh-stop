import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..");
const srcDir = join(projectRoot, "src");

// Use Node for discovery so npm test works in PowerShell, cmd and POSIX shells.
function testFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? testFiles(file) : entry.name.endsWith(".test.ts") ? [file] : [];
  });
}

// DB-backed suites share one database and some run global sweeps, so files run serially.
const files = testFiles(srcDir).sort();
if (!files.length) throw new Error("No test files found in src.");
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", "--test-concurrency=1", ...files], {
  cwd: projectRoot,
  stdio: "inherit"
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
