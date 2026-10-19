/** Read-only schema compatibility audit. Run: npx tsx scripts/check-database-schema.ts */
import { loadEnvConfig } from "@next/env";
import { Prisma, PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { assertSafeDatabaseTarget } from "./db-guard.mjs";
import { matchesDeclaredIndex, type DatabaseIndex, type DeclaredIndex } from "../src/lib/database-index";

interface Column { table_name: string; column_name: string; udt_name: string; is_nullable: string; column_default: string | null }
interface Finding { table: string; field?: string; issue: string; expected?: string; actual?: string }

async function main() {
  loadEnvConfig(process.cwd());
  const connectionVariables = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
  const requested = process.argv.find(arg => arg.startsWith("--connection-variable="))?.split("=")[1];
  if (requested && !connectionVariables.includes(requested)) throw new Error("INVALID_CONNECTION_VARIABLE");
  const source = requested ?? connectionVariables.find(key => process.env[key]);
  if (!source || !process.env[source]) throw new Error("DATABASE_CONFIGURATION_MISSING");
  // Read-only audit, but it still refuses remote targets unless ALLOW_REMOTE_DB_READ=yes-i-approved.
  assertSafeDatabaseTarget({ mode: "read", env: { ...process.env, DATABASE_URL: process.env[source] }, label: "check-database-schema" });
  const db = new PrismaClient({ datasources: { db: { url: process.env[source]! } }, log: [] });
  try {
    const metadata = await db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const columns = await tx.$queryRaw<Column[]>`
        SELECT table_name, column_name, udt_name, is_nullable, column_default
        FROM information_schema.columns WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position`;
      const indexes = await tx.$queryRaw<DatabaseIndex[]>`
        SELECT t.relname AS table_name, i.relname AS index_name,
          x.indisunique AS is_unique, x.indisprimary AS is_primary,
          x.indisvalid AS is_valid, x.indisready AS is_ready,
          (x.indpred IS NOT NULL) AS is_partial, am.amname AS access_method, x.indnkeyatts AS key_count,
          array_agg(a.attname::text ORDER BY k.ordinality) AS columns
        FROM pg_index x JOIN pg_class t ON t.oid = x.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_class i ON i.oid = x.indexrelid
        JOIN pg_am am ON am.oid = i.relam
        JOIN LATERAL unnest(x.indkey) WITH ORDINALITY k(attnum, ordinality) ON true
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE n.nspname = 'public' AND k.ordinality <= x.indnkeyatts
        GROUP BY t.relname, i.relname, x.indisunique, x.indisprimary,
          x.indisvalid, x.indisready, x.indpred IS NOT NULL, am.amname, x.indnkeyatts`;
      return { columns, indexes };
    }, { timeout: 20000 });
    const findings: Finding[] = [];
    const types: Record<string, string> = { String: "text", Float: "float8", Int: "int4", Boolean: "bool", DateTime: "timestamp" };
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    for (const model of Prisma.dmmf.datamodel.models) {
      const table = model.dbName ?? model.name;
      for (const field of model.fields.filter(f => f.kind !== "object")) {
        const name = field.dbName ?? field.name;
        const column = metadata.columns.find(c => c.table_name === table && c.column_name === name);
        if (!column) { findings.push({ table, field: name, issue: "missing column" }); continue; }
        if (types[field.type] && column.udt_name !== types[field.type]) findings.push({ table, field: name, issue: "column type", expected: types[field.type], actual: column.udt_name });
        const nullable = field.isRequired ? "NO" : "YES";
        if (column.is_nullable !== nullable) findings.push({ table, field: name, issue: "nullability", expected: nullable, actual: column.is_nullable });
        if (typeof field.default === "boolean" || typeof field.default === "number") {
          const expected = String(field.default);
          const actual = column.column_default?.replace(/::.*$/, "").replace(/[()']/g, "").trim();
          const matches = typeof field.default === "number" ? actual !== undefined && Number(actual) === field.default : actual === expected;
          if (!matches) findings.push({ table, field: name, issue: "default", expected, actual: column.column_default === null ? "absent" : "different" });
        }
      }
      const expectedIndexes: DeclaredIndex[] = model.fields.filter(f => f.isUnique || f.isId).map(f => ({ columns: [f.dbName ?? f.name], unique: true, primary: f.isId }));
      for (const fields of model.uniqueFields) expectedIndexes.push({ columns: [...fields], unique: true });
      const block = schema.match(new RegExp(`model ${model.name} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";
      for (const match of block.matchAll(/@@index\(\[([^\]]+)\]/g)) expectedIndexes.push({ columns: match[1].split(",").map(s => s.trim()), unique: false });
      for (const index of expectedIndexes) {
        const found = metadata.indexes.some(i => i.table_name === table && matchesDeclaredIndex(i, index));
        if (!found) findings.push({ table, issue: index.primary ? "missing primary key" : index.unique ? "missing unique index" : "missing index", expected: index.columns.join(", ") });
      }
    }
    console.log(JSON.stringify({ readOnly: true, connectionVariable: source, applicationDatabaseUrlConfigured: /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? ""), directUrlConfigured: /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL_UNPOOLED ?? ""), modelsChecked: Prisma.dmmf.datamodel.models.length, compatible: findings.length === 0, findings, scope: "Prisma scalar column types, nullability, numeric/boolean defaults, primary keys and valid/ready full btree indexes with matching key columns; no row data or credentials queried or printed." }, null, 2));
    if (findings.length) process.exitCode = 1;
  } finally { await db.$disconnect(); }
}

main().catch((error: unknown) => {
  // Prisma messages can include connection strings. Emit only bounded identifiers.
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Error && error.message === "DATABASE_CONFIGURATION_MISSING" ? error.message : "SCHEMA_AUDIT_FAILED";
  console.error(JSON.stringify({ readOnly: true, error: code }));
  process.exitCode = 1;
});
