import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { decodeBasic } from "./admin-auth";
import { jsonNoStore, requireAdmin, requireWritableAdmin, sameOrigin } from "./admin-route";

/** Default cap for admin JSON bodies. Admin payloads are tiny; anything larger is refused. */
export const MAX_ADMIN_BODY_BYTES = 16 * 1024;
const MAX_AUDIT_JSON_CHARS = 8000;
const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|api[-_]?key|card/i;

export type AdminGuard =
  | { ok: true; admin: string; body: Record<string, unknown> }
  | { ok: false; response: NextResponse };

/** Name of the Basic-Auth user making the request. Never includes the password. */
export function adminUserFrom(request: Request): string {
  const user = decodeBasic(request.headers.get("authorization"))?.user?.trim();
  return user ? user.slice(0, 64) : "admin";
}

async function readLimitedText(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Gate shared by every mutating admin handler, in a fixed order so no input is read before
 * authentication: requireAdmin, preview read-only check, same-origin check, size-capped JSON object body.
 */
export async function guardAdminMutation(request: Request, maxBytes = MAX_ADMIN_BODY_BYTES): Promise<AdminGuard> {
  const denied = requireAdmin(request) ?? requireWritableAdmin();
  if (denied) return { ok: false, response: denied };
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!sameOrigin(request) || fetchSite === "cross-site") {
    return { ok: false, response: jsonNoStore({ error: "Invalid request origin." }, 403) };
  }
  const text = await readLimitedText(request, maxBytes);
  if (text === null) return { ok: false, response: jsonNoStore({ error: "Request body is too large." }, 413) };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, response: jsonNoStore({ error: "Invalid JSON body." }, 400) };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, response: jsonNoStore({ error: "Invalid request body." }, 400) };
  }
  return { ok: true, admin: adminUserFrom(request), body: parsed as Record<string, unknown> };
}

/** Serialise a value for the audit log: sensitive keys redacted, size bounded. */
export function auditJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = JSON.stringify(value, (key, v) => (SENSITIVE_KEY.test(key) ? "[redacted]" : v));
  return text.length > MAX_AUDIT_JSON_CHARS ? `${text.slice(0, MAX_AUDIT_JSON_CHARS)}…[truncated]` : text;
}

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  details?: string;
  admin: string;
}

/** Write an audit row. Pass the transaction client so the row commits atomically with the change. */
export function recordAudit(tx: Prisma.TransactionClient, entry: AuditEntry) {
  return tx.adminAuditLog.create({
    data: {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      details: entry.details?.slice(0, 500) ?? null,
      beforeJson: auditJson(entry.before),
      afterJson: auditJson(entry.after),
      adminUser: entry.admin
    }
  });
}

/** Thrown inside a transaction to abort it with a client-facing status. */
export class AdminHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

/** Convert a thrown error into a JSON response; unknown errors become a generic 500 (details only in server logs). */
export function adminErrorResponse(error: unknown, label: string): NextResponse {
  if (error instanceof AdminHttpError) return jsonNoStore({ error: error.message, ...error.extra }, error.status);
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^P\d{4}$/.test(error.code) ? error.code : "UNEXPECTED_ERROR";
  console.error(`${label} failed`, { code });
  return jsonNoStore({ error: `${label} failed.` }, 500);
}

export const jsonError = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  jsonNoStore({ error, ...extra }, status);
