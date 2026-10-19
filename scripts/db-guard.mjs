// Shared safety guard for every script that touches the database.
//
// Rule: scripts only run against localhost/127.0.0.1/::1 unless a human has set an explicit
// approval flag in that shell. Writes need ALLOW_REMOTE_DB_WRITE=yes-i-approved; read-only
// reports need ALLOW_REMOTE_DB_READ=yes-i-approved (or the write flag).
// The guard never prints passwords or full connection strings.

export const APPROVAL_VALUE = "yes-i-approved";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const URL_VARIABLES = ["DATABASE_URL", "DATABASE_URL_UNPOOLED"];

/** Parse a postgres URL into a credential-free identity. */
export function describeDatabaseUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { valid: false, host: "", port: "", database: "", user: "", projectRef: null, isLocal: false };
  }
  const host = url.hostname.toLowerCase();
  const user = decodeURIComponent(url.username);
  const hostRef = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1];
  const userRef = host.endsWith(".pooler.supabase.com") ? user.split(".")[1] : undefined;
  return {
    valid: true,
    host,
    port: url.port || "5432",
    database: url.pathname.replace(/^\//, ""),
    user: user.split(".")[0],
    projectRef: hostRef ?? userRef ?? null,
    isLocal: LOCAL_HOSTS.has(host),
  };
}

function approvalFor(mode, env) {
  const write = env.ALLOW_REMOTE_DB_WRITE === APPROVAL_VALUE;
  const read = env.ALLOW_REMOTE_DB_READ === APPROVAL_VALUE;
  return mode === "write" ? write : write || read;
}

/**
 * Throws unless every configured DATABASE_URL* variable targets a local host or the matching
 * approval flag is set. Returns the identities (credential-free) for logging.
 * @param {{mode?: "read"|"write", env?: Record<string,string|undefined>, label?: string}} [options]
 */
export function assertSafeDatabaseTarget(options = {}) {
  const { mode = "write", env = process.env, label = "script" } = options;
  const configured = URL_VARIABLES.filter((name) => env[name]);
  if (!configured.includes("DATABASE_URL")) {
    throw new Error(`${label}: DATABASE_URL is not set. Refusing to guess a database.`);
  }
  const identities = configured.map((name) => ({ name, ...describeDatabaseUrl(env[name]) }));
  const invalid = identities.find((i) => !i.valid);
  if (invalid) throw new Error(`${label}: ${invalid.name} is not a valid URL.`);
  const remote = identities.filter((i) => !i.isLocal);
  if (remote.length > 0 && !approvalFor(mode, env)) {
    const flag = mode === "write" ? "ALLOW_REMOTE_DB_WRITE" : "ALLOW_REMOTE_DB_READ";
    const where = remote.map((i) => `${i.name}=${i.host}${i.projectRef ? ` (project ${i.projectRef})` : ""}/${i.database}`).join(", ");
    throw new Error(`${label}: refusing ${mode} on a non-local database [${where}]. A human must set ${flag}=${APPROVAL_VALUE} after a backup.`);
  }
  return identities;
}

/** One-line, credential-free banner for logs. */
export function formatIdentity(identities) {
  return identities
    .map((i) => `${i.name}->${i.isLocal ? "LOCAL" : "REMOTE"} ${i.host}:${i.port}/${i.database}${i.projectRef ? ` project=${i.projectRef}` : ""}`)
    .join("; ");
}
