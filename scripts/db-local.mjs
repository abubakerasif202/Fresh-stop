#!/usr/bin/env node
// Manage the DISPOSABLE local Postgres used for Fresh Stop development/tests.
// Usage: node scripts/db-local.mjs start|stop|status|reset
// Never touches any remote database. `reset` drops and recreates fresh_stop_dev only.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, openSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const PORT = "54329";
const USER = "fs_dev";
const DB = "fresh_stop_dev";
const BIN =
  process.env.FS_PG_BIN ??
  path.join(os.homedir(), "scoop", "apps", "postgresql", "current", "bin");
const DATA = process.env.FS_PG_DATA ?? path.join(os.homedir(), "fresh-stop-pgdata");
const exe = (name) => path.join(BIN, process.platform === "win32" ? `${name}.exe` : name);
export const LOCAL_URL = `postgresql://${USER}:${USER}@localhost:${PORT}/${DB}`;

function run(cmd, args) {
  return spawnSync(exe(cmd), args, { encoding: "utf8" });
}

function isReady() {
  return run("pg_isready", ["-h", "localhost", "-p", PORT]).status === 0;
}

function ensureCluster() {
  if (existsSync(path.join(DATA, "PG_VERSION"))) return;
  const r = run("initdb", ["-D", DATA, "-U", USER, "-A", "trust", "-E", "UTF8"]);
  if (r.status !== 0) throw new Error(`initdb failed: ${r.stderr}`);
}

function start() {
  ensureCluster();
  if (isReady()) return console.log("already running on port " + PORT);
  const log = openSync(path.join(DATA, "server.log"), "a");
  // Detached so the parent shell is not held open by inherited handles.
  const child = spawn(
    exe("pg_ctl"),
    ["-D", DATA, "-o", `-p ${PORT} -c listen_addresses=localhost`, "-w", "start"],
    { detached: true, stdio: ["ignore", log, log] },
  );
  child.unref();
  for (let i = 0; i < 40 && !isReady(); i++) spawnSync(process.execPath, ["-e", "setTimeout(()=>{},500)"]);
  if (!isReady()) throw new Error("postgres did not become ready; see " + path.join(DATA, "server.log"));
  const created = run("psql", ["-h", "localhost", "-p", PORT, "-U", USER, "-d", "postgres", "-Atc", `create database ${DB}`]);
  console.log(created.status === 0 ? `started; created ${DB}` : `started; ${DB} already exists`);
}

function stop() {
  const r = run("pg_ctl", ["-D", DATA, "-m", "fast", "stop"]);
  console.log(r.status === 0 ? "stopped" : "not running");
}

function reset() {
  if (!isReady()) start();
  const psql = (sql) => run("psql", ["-h", "localhost", "-p", PORT, "-U", USER, "-d", "postgres", "-Atc", sql]);
  psql(`drop database if exists ${DB} with (force)`);
  const r = psql(`create database ${DB}`);
  if (r.status !== 0) throw new Error(r.stderr);
  console.log(`reset ${DB}`);
}

const cmd = process.argv[2];
try {
  if (cmd === "start") start();
  else if (cmd === "stop") stop();
  else if (cmd === "status") console.log(isReady() ? `running on ${LOCAL_URL.replace(/:[^:@]*@/, ":***@")}` : "stopped");
  else if (cmd === "reset") reset();
  else {
    console.error("usage: node scripts/db-local.mjs start|stop|status|reset");
    process.exit(2);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
