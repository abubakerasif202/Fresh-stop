/**
 * Supabase shared pooler port 5432 pins a database connection per client.
 * Serverless Production functions use the transaction pooler on 6543 instead;
 * Prisma 5 needs pgbouncer=true there so it does not use prepared statements.
 */
export function runtimeDatabaseUrl(databaseUrl?: string): string | undefined {
  if (!databaseUrl) return undefined;
  try {
    const url = new URL(databaseUrl);
    if (url.hostname.endsWith(".pooler.supabase.com")) {
      if (url.port === "5432" || !url.port) url.port = "6543";
      if (url.port === "6543") url.searchParams.set("pgbouncer", "true");
    }
    return url.toString();
  } catch {
    return databaseUrl;
  }
}
