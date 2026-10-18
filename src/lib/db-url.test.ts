import test from "node:test";
import assert from "node:assert/strict";
import { runtimeDatabaseUrl } from "./db-url";

test("Supabase shared session-pooler URLs use transaction pooling for runtime queries", () => {
  const url = runtimeDatabaseUrl("postgresql://postgres.project-ref:private@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=require");
  assert.ok(url);
  const parsed = new URL(url);
  assert.equal(parsed.port, "6543");
  assert.equal(parsed.searchParams.get("pgbouncer"), "true");
  assert.equal(parsed.searchParams.get("sslmode"), "require");
  assert.equal(parsed.username, "postgres.project-ref");
  assert.equal(parsed.password, "private");
});

test("transaction pooler URLs enable Prisma compatibility and direct URLs are preserved", () => {
  const transaction = "postgresql://postgres.project-ref:private@aws-0-region.pooler.supabase.com:6543/postgres";
  const transactionWithFalseFlag = "postgresql://postgres.project-ref:private@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=false";
  const direct = "postgresql://postgres:private@db.project-ref.supabase.co:5432/postgres";
  assert.equal(new URL(runtimeDatabaseUrl(transaction)!).searchParams.get("pgbouncer"), "true");
  assert.equal(new URL(runtimeDatabaseUrl(transactionWithFalseFlag)!).searchParams.get("pgbouncer"), "true");
  assert.equal(runtimeDatabaseUrl(direct), direct);
});

test("invalid or missing URLs are left to Prisma to report", () => {
  assert.equal(runtimeDatabaseUrl("not a url"), "not a url");
  assert.equal(runtimeDatabaseUrl(undefined), undefined);
});
