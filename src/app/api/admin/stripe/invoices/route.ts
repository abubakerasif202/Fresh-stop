import { randomUUID } from "node:crypto";
import { jsonNoStore, requireAdmin, requireWritableAdmin, sameOrigin } from "@/lib/admin-route";
import { sharedRateLimit, getClientIp } from "@/lib/rate-limit";
import { addField, stripeApi, stripeSandboxEnabled, verifySandboxAccount } from "@/lib/stripe-sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Protected test invoice drafts for wholesale. Finalize/send from Stripe Dashboard after review. */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const readOnly = requireWritableAdmin();
  if (readOnly) return readOnly;
  if (!stripeSandboxEnabled() || process.env.STRIPE_INVOICING_ENABLED !== "true") return jsonNoStore({ error: "Sandbox invoicing disabled." }, 404);
  if (!sameOrigin(request)) return jsonNoStore({ error: "Invalid request origin." }, 403);
  const limited = await sharedRateLimit("stripe-invoice:" + getClientIp(request.headers), { limit: 10, windowMs: 60000 });
  if (!limited.ok) return jsonNoStore({ error: "Invoicing temporarily unavailable." }, limited.unavailable ? 503 : 429);
  if (Number(request.headers.get("content-length") ?? 0) > 12000) return jsonNoStore({ error: "Request too large." }, 413);
  let body: Record<string, unknown>;
  try {
    const input: unknown = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid body.");
    body = input as Record<string, unknown>;
  } catch { return jsonNoStore({ error: "Invalid request." }, 400); }
  const email = body.customerEmail, name = body.customerName, items = body.items, requestId = body.requestId;
  const days = body.daysUntilDue === undefined ? 14 : body.daysUntilDue;
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof name !== "string" || name.trim().length < 2 || name.length > 120 ||
    typeof requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(requestId) ||
    !Number.isSafeInteger(days) || (days as number) < 1 || (days as number) > 90 ||
    !Array.isArray(items) || items.length < 1 || items.length > 30 || body.taxTreatmentConfirmed !== true) {
    return jsonNoStore({ error: "Invalid customer, invoice terms, idempotency ID or tax approval." }, 422);
  }
  const parsed: { description: string; quantity: number; unitAmountCents: number }[] = [];
  let amount = 0;
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return jsonNoStore({ error: "Invalid invoice item." }, 422);
    const row = item as Record<string, unknown>;
    if (typeof row.description !== "string" || !row.description.trim() || row.description.length > 250 ||
      !Number.isSafeInteger(row.quantity) || (row.quantity as number) < 1 || (row.quantity as number) > 100 ||
      !Number.isSafeInteger(row.unitAmountCents) || (row.unitAmountCents as number) < 1 || (row.unitAmountCents as number) > 1_000_000) {
      return jsonNoStore({ error: "Invalid invoice line amount or description." }, 422);
    }
    amount += (row.quantity as number) * (row.unitAmountCents as number);
    parsed.push({ description: row.description.trim(), quantity: row.quantity as number, unitAmountCents: row.unitAmountCents as number });
  }
  if (amount > 10_000_000) return jsonNoStore({ error: "Invoice amount exceeds test limit." }, 422);
  try {
    await verifySandboxAccount();
    const customerForm = new URLSearchParams();
    addField(customerForm, "name", name.trim());
    addField(customerForm, "email", email);
    addField(customerForm, "metadata[source]", "freshstop-wholesale-test");
    const customer = await stripeApi("POST", "/customers", customerForm, "fs-invoice-customer-" + requestId);
    if (typeof customer.id !== "string") throw new Error("Missing customer.");
    const form = new URLSearchParams();
    addField(form, "customer", customer.id);
    addField(form, "collection_method", "send_invoice");
    addField(form, "days_until_due", days as number);
    addField(form, "currency", "aud");
    addField(form, "auto_advance", "false");
    addField(form, "pending_invoice_items_behavior", "exclude");
    addField(form, "metadata[origin]", "freshstop-sandbox-wholesale");
    addField(form, "metadata[request_id]", requestId);
    const invoice = await stripeApi("POST", "/invoices", form, "fs-invoice-create-" + requestId);
    if (typeof invoice.id !== "string" || !/^in_[a-zA-Z0-9]+$/.test(invoice.id)) throw new Error("Missing invoice.");
    for (let i = 0; i < parsed.length; i++) {
      const line = parsed[i];
      const fields = new URLSearchParams();
      addField(fields, "customer", customer.id);
      addField(fields, "invoice", invoice.id);
      addField(fields, "currency", "aud");
      addField(fields, "description", line.description);
      addField(fields, "unit_amount", line.unitAmountCents);
      addField(fields, "quantity", line.quantity);
      await stripeApi("POST", "/invoiceitems", fields, "fs-invoice-line-" + requestId + "-" + i);
    }
    return jsonNoStore({ invoiceId: invoice.id, status: "draft", next: "Review, finalize and send in Stripe test Dashboard. Do not send until tax treatment is verified." }, 201);
  } catch {
    return jsonNoStore({ error: "Could not prepare test invoice. Reuse the same requestId when retrying to avoid duplicates." }, 502);
  }
}
