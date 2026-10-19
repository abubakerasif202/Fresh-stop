import type { DeliveryZone, Prisma } from "@prisma/client";
import { db } from "./db";
import { AdminHttpError, recordAudit } from "./admin-audit";

export const MAX_FEE_CENTS = 50_000;
export const MAX_THRESHOLD_CENTS = 1_000_000;
const MAX_POSTCODES = 300;
/** Legacy NOT NULL Float stand-in for "no free delivery": large enough that no basket reaches it. */
export const NO_FREE_DELIVERY_LEGACY = 999_999;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface ZoneInput {
  name?: string;
  postcodes?: string;
  deliveryFeeCents?: number | null;
  freeDeliveryMinCents?: number | null;
  minOrderCents?: number | null;
  deliveryDays?: string | null;
  orderCutoffHour?: number | null;
  maxDailyOrders?: number | null;
  primaryBranchSlug?: string;
  isActive?: boolean;
}

/** Fields that change what a customer pays, can order, or whether they can order: edits reset approval. */
export const APPROVAL_SENSITIVE: readonly (keyof ZoneInput)[] = ["deliveryFeeCents", "freeDeliveryMinCents", "minOrderCents", "postcodes", "isActive", "primaryBranchSlug", "deliveryDays", "orderCutoffHour", "maxDailyOrders"];

/** Parse "2216, 2217 2218" or an array into a sorted, de-duplicated list of 4-digit postcodes. */
export function parsePostcodes(input: unknown): { ok: true; postcodes: string[] } | { ok: false; error: string } {
  const tokens = Array.isArray(input) ? input.map(String) : typeof input === "string" ? input.split(/[\s,;]+/) : null;
  if (!tokens) return { ok: false, error: "Postcodes must be a comma-separated list." };
  const cleaned = tokens.map((t) => t.trim()).filter(Boolean);
  const bad = cleaned.filter((t) => !/^\d{4}$/.test(t));
  if (bad.length) return { ok: false, error: `Invalid postcode${bad.length > 1 ? "s" : ""}: ${bad.slice(0, 5).join(", ")}. Use 4 digits.` };
  const unique = [...new Set(cleaned)].sort();
  if (unique.length === 0) return { ok: false, error: "Add at least one postcode." };
  if (unique.length > MAX_POSTCODES) return { ok: false, error: `At most ${MAX_POSTCODES} postcodes per zone.` };
  return { ok: true, postcodes: unique };
}

const nullableInt = (v: unknown, min: number, max: number): number | null | undefined => {
  if (v === null) return null;
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : undefined;
};

function parseDays(v: unknown): string | null | undefined {
  if (v === null || v === "") return null;
  if (typeof v !== "string") return undefined;
  const days = v.split(/[\s,]+/).filter(Boolean);
  return days.length && days.every((d) => DAYS.includes(d)) ? [...new Set(days)].join(",") : undefined;
}

/** Validate a (partial) zone payload. Money is accepted only as integer cents. */
export function validateZoneInput(body: Record<string, unknown>, partial: boolean): { ok: true; value: ZoneInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const value: ZoneInput = {};
  const has = (k: string) => k in body;
  if (has("name") || !partial) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 80) errors.name = "Name must be 2 to 80 characters.";
    else value.name = name;
  }
  if (has("postcodes") || !partial) {
    const parsed = parsePostcodes(body.postcodes);
    if (parsed.ok) value.postcodes = parsed.postcodes.join(",");
    else errors.postcodes = parsed.error;
  }
  if (has("primaryBranchSlug") || !partial) {
    if (typeof body.primaryBranchSlug === "string" && /^[a-z0-9-]{1,60}$/.test(body.primaryBranchSlug)) value.primaryBranchSlug = body.primaryBranchSlug;
    else errors.primaryBranchSlug = "Choose a branch.";
  }
  const money: [keyof ZoneInput, number][] = [["deliveryFeeCents", MAX_FEE_CENTS], ["freeDeliveryMinCents", MAX_THRESHOLD_CENTS], ["minOrderCents", MAX_THRESHOLD_CENTS]];
  for (const [key, max] of money) {
    if (!has(key)) continue;
    const parsed = nullableInt(body[key], key === "freeDeliveryMinCents" ? 1 : 0, max);
    if (parsed === undefined) errors[key] = `Enter a whole number of cents from ${key === "freeDeliveryMinCents" ? 1 : 0} to ${max}, or leave empty.`;
    else (value as Record<string, unknown>)[key] = parsed;
  }
  if (has("orderCutoffHour")) {
    const v = nullableInt(body.orderCutoffHour, 0, 23);
    if (v === undefined) errors.orderCutoffHour = "Cut-off hour must be 0 to 23."; else value.orderCutoffHour = v;
  }
  if (has("maxDailyOrders")) {
    const v = nullableInt(body.maxDailyOrders, 1, 10_000);
    if (v === undefined) errors.maxDailyOrders = "Maximum daily orders must be a whole number of 1 or more."; else value.maxDailyOrders = v;
  }
  if (has("deliveryDays")) {
    const v = parseDays(body.deliveryDays);
    if (v === undefined) errors.deliveryDays = `Use day names: ${DAYS.join(", ")}.`; else value.deliveryDays = v;
  }
  if (has("isActive")) {
    if (typeof body.isActive === "boolean") value.isActive = body.isActive;
    else errors.isActive = "isActive must be true or false.";
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

/** Legacy Float columns are NOT NULL and deprecated; derive them from cents so they never disagree. */
export function legacyFloats(cents: { deliveryFeeCents: number | null; freeDeliveryMinCents: number | null; minOrderCents: number | null }) {
  return {
    deliveryFee: (cents.deliveryFeeCents ?? 0) / 100,
    freeDeliveryMinSpend: cents.freeDeliveryMinCents === null ? NO_FREE_DELIVERY_LEGACY : cents.freeDeliveryMinCents / 100,
    minOrderAmount: (cents.minOrderCents ?? 0) / 100
  };
}

const zoneView = (z: DeliveryZone) => ({
  name: z.name, postcodes: z.postcodes, deliveryFeeCents: z.deliveryFeeCents, freeDeliveryMinCents: z.freeDeliveryMinCents,
  minOrderCents: z.minOrderCents, deliveryDays: z.deliveryDays, orderCutoffHour: z.orderCutoffHour, maxDailyOrders: z.maxDailyOrders,
  primaryBranchSlug: z.primaryBranchSlug, isActive: z.isActive, isApproved: z.isApproved, approvedBy: z.approvedBy, approvedAt: z.approvedAt
});

async function requireBranch(tx: Prisma.TransactionClient, slug: string) {
  if (!(await tx.storeBranch.findFirst({ where: { slug, isActive: true }, select: { id: true } }))) {
    throw new AdminHttpError(422, "Please fix the highlighted fields.", { fields: { primaryBranchSlug: "Branch not found or inactive." } });
  }
}

export function createZone(input: ZoneInput, admin: string) {
  return db.$transaction(async (tx) => {
    await requireBranch(tx, input.primaryBranchSlug as string);
    const cents = { deliveryFeeCents: input.deliveryFeeCents ?? null, freeDeliveryMinCents: input.freeDeliveryMinCents ?? null, minOrderCents: input.minOrderCents ?? null };
    const zone = await tx.deliveryZone.create({
      data: {
        name: input.name as string, postcodes: input.postcodes as string, primaryBranchSlug: input.primaryBranchSlug as string,
        ...cents, ...legacyFloats(cents), deliveryDays: input.deliveryDays ?? null, orderCutoffHour: input.orderCutoffHour ?? null,
        maxDailyOrders: input.maxDailyOrders ?? null, isActive: input.isActive ?? true, isApproved: false
      }
    });
    await recordAudit(tx, { action: "DELIVERY_ZONE_CREATED", entityType: "DeliveryZone", entityId: zone.id, admin, after: zoneView(zone), details: `Created delivery zone ${zone.name}` });
    return zone;
  });
}

/** Edit a zone. Any change to money fields or postcodes clears approval until a named admin re-approves. */
export function updateZone(id: string, input: ZoneInput, admin: string) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(73149012)`;
    const before = await tx.deliveryZone.findUnique({ where: { id } });
    if (!before) throw new AdminHttpError(404, "Delivery zone not found.");
    if (input.primaryBranchSlug) await requireBranch(tx, input.primaryBranchSlug);
    const merged = { ...zoneView(before), ...input };
    const changed = APPROVAL_SENSITIVE.some((k) => k in input && input[k] !== (before as Record<string, unknown>)[k]);
    const approvalReset = before.isApproved && changed;
    const data = {
      ...input, ...legacyFloats(merged),
      ...(approvalReset ? { isApproved: false, approvedBy: null, approvedAt: null } : {})
    };
    const zone = await tx.deliveryZone.update({ where: { id }, data });
    await recordAudit(tx, {
      action: approvalReset ? "DELIVERY_ZONE_UPDATED_APPROVAL_RESET" : "DELIVERY_ZONE_UPDATED", entityType: "DeliveryZone", entityId: id, admin,
      before: zoneView(before), after: zoneView(zone), details: `Updated delivery zone ${zone.name}${approvalReset ? " (approval reset)" : ""}`
    });
    return { zone, approvalReset };
  });
}

function approvalProblems(zone: DeliveryZone, others: DeliveryZone[]): string[] {
  const problems: string[] = [];
  if (!zone.isActive) problems.push("Zone is inactive.");
  if (zone.deliveryFeeCents === null) problems.push("Delivery fee is not set.");
  if (zone.deliveryDays !== null || zone.orderCutoffHour !== null || zone.maxDailyOrders !== null) {
    problems.push("Delivery scheduling and capacity limits are not supported by checkout yet. Clear these fields before approval, or complete scheduling enforcement first.");
  }
  const list = zone.postcodes.split(",").filter(Boolean);
  if (!list.length || !list.every((p) => /^\d{4}$/.test(p))) problems.push("Postcodes are missing or invalid.");
  const taken = new Set(others.filter((o) => o.isApproved && o.isActive && o.id !== zone.id).flatMap((o) => o.postcodes.split(",")));
  const clash = list.filter((p) => taken.has(p));
  if (clash.length) problems.push(`Postcodes already in another approved zone: ${clash.slice(0, 5).join(", ")}.`);
  return problems;
}

export function approveZone(id: string, admin: string) {
  return db.$transaction(async (tx) => {
    // Serialize approval and edits across zones so overlapping postcode checks cannot race.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(73149012)`;
    const before = await tx.deliveryZone.findUnique({ where: { id } });
    if (!before) throw new AdminHttpError(404, "Delivery zone not found.");
    await requireBranch(tx, before.primaryBranchSlug);
    const problems = approvalProblems(before, await tx.deliveryZone.findMany());
    if (problems.length) throw new AdminHttpError(422, "This zone cannot be approved yet.", { reasons: problems });
    const zone = await tx.deliveryZone.update({ where: { id }, data: { isApproved: true, approvedBy: admin, approvedAt: new Date() } });
    await recordAudit(tx, { action: "DELIVERY_ZONE_APPROVED", entityType: "DeliveryZone", entityId: id, admin, before: zoneView(before), after: zoneView(zone), details: `Approved delivery zone ${zone.name}` });
    return zone;
  });
}

export function unapproveZone(id: string, admin: string) {
  return db.$transaction(async (tx) => {
    const before = await tx.deliveryZone.findUnique({ where: { id } });
    if (!before) throw new AdminHttpError(404, "Delivery zone not found.");
    const zone = await tx.deliveryZone.update({ where: { id }, data: { isApproved: false, approvedBy: null, approvedAt: null } });
    await recordAudit(tx, { action: "DELIVERY_ZONE_UNAPPROVED", entityType: "DeliveryZone", entityId: id, admin, before: zoneView(before), after: zoneView(zone) });
    return zone;
  });
}

export function deleteZone(id: string, admin: string) {
  return db.$transaction(async (tx) => {
    const before = await tx.deliveryZone.findUnique({ where: { id } });
    if (!before) throw new AdminHttpError(404, "Delivery zone not found.");
    await tx.deliveryZone.delete({ where: { id } });
    await recordAudit(tx, { action: "DELIVERY_ZONE_DELETED", entityType: "DeliveryZone", entityId: id, admin, before: zoneView(before), details: `Deleted delivery zone ${before.name}` });
  });
}
