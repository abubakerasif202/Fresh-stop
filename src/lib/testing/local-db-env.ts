/**
 * Test-only guard. Importing this module BEFORE "@/lib/db" guarantees tests can
 * only ever talk to the disposable local Postgres (never a remote database).
 */
const LOCAL_URL = "postgresql://fs_dev:fs_dev@localhost:54329/fresh_stop_dev";

function isDisposableLocal(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return (url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.port === "54329" && url.pathname === "/fresh_stop_dev";
  } catch {
    return false;
  }
}

if ([process.env.DATABASE_URL, process.env.DATABASE_URL_UNPOOLED].some((value) => value && !isDisposableLocal(value))) {
  throw new Error("Refusing to run DB tests: DATABASE_URL is not the disposable local database (localhost:54329).");
}
process.env.DATABASE_URL = process.env.DATABASE_URL || LOCAL_URL;
process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export const LOCAL_DATABASE_URL = LOCAL_URL;
