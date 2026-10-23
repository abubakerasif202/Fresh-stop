import { Resend } from "resend";
import { db } from "./db";
import { CONTACT } from "./contact";
import { createOrderTrackingToken } from "./order-tracking";
import { SITE_URL } from "./site";

export type EmailSkipReason = "NOT_CONFIGURED" | "ALREADY_SENT" | "IN_PROGRESS" | "NOT_PAID" | "NOT_FOUND" | "SEND_FAILED";

export interface EmailSendStatus {
  sent: boolean;
  reason?: EmailSkipReason;
}

export interface OrderEmailResult {
  customer: EmailSendStatus;
  business: EmailSendStatus;
}

export interface OutboundEmail {
  idempotencyKey?: string;
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  html: string;
}

export type EmailTransport = (message: OutboundEmail) => Promise<void>;

let injectedTransport: EmailTransport | null = null;

/** Test hook: replace the Resend transport. Pass null to restore the default. */
export function setEmailTransportForTests(transport: EmailTransport | null): void {
  injectedTransport = transport;
}

export function resolveTransport(): EmailTransport | null {
  if (injectedTransport) return injectedTransport;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const client = new Resend(apiKey);
  return async (message) => {
    const { idempotencyKey, ...payload } = message;
    const { data, error } = await client.emails.send(payload, { idempotencyKey });
    if (error) throw new Error(error.name);
    if (!data?.id) throw new Error("EmailProviderResponseError");
  };
}

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

/** Escapes every interpolated value placed into email HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Single-line plain text safe for a subject header (no CR/LF injection). */
export function sanitizeSubject(value: string): string {
  return value.replace(/[\r\n\u2028\u2029]+/g, " ").trim().slice(0, 200);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export interface EmailLineItem {
  name: string;
  unit: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface OrderEmailData {
  trackingUrl?: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentType: string;
  deliveryAddress: string | null;
  deliverySuburb: string | null;
  deliveryPostcode: string | null;
  deliveryNotes: string | null;
  preferredDeliveryDate: string | null;
  pickupLocation: string | null;
  items: EmailLineItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  gstCents: number;
  totalCents: number;
}

function itemRows(items: EmailLineItem[]): string {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-weight:bold;color:#0B3D1B;">${escapeHtml(item.name)} <span style="font-size:12px;font-weight:normal;color:#666;">(${escapeHtml(item.unit)})</span></td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:center;color:#333;">${escapeHtml(item.quantity)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;color:#333;">${formatCents(item.unitPriceCents)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:bold;color:#0B3D1B;">${formatCents(item.totalCents)}</td>
      </tr>`
    )
    .join("");
}

function fulfilmentLines(data: OrderEmailData): string {
  const lines: string[] = [
    `<strong>Order Reference:</strong> ${escapeHtml(data.orderNumber)}`,
    `<strong>Fulfilment:</strong> ${data.fulfillmentType === "DELIVERY" ? "Home Delivery" : "Store Pickup"}`
  ];
  if (data.fulfillmentType === "DELIVERY") {
    const place = [data.deliveryAddress, [data.deliverySuburb, data.deliveryPostcode].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    lines.push(`<strong>Delivery Address:</strong> ${escapeHtml(place)}`);
  } else if (data.pickupLocation) {
    lines.push(`<strong>Pickup:</strong> ${escapeHtml(data.pickupLocation)}`);
  }
  if (data.preferredDeliveryDate) lines.push(`<strong>Preferred Date:</strong> ${escapeHtml(data.preferredDeliveryDate)}`);
  if (data.deliveryNotes) lines.push(`<strong>Notes:</strong> ${escapeHtml(data.deliveryNotes)}`);
  return lines.join("<br />");
}

function totalsBlock(data: OrderEmailData): string {
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:3px 0;color:${strong ? "#0B3D1B" : "#555"};${strong ? "font-weight:900;font-size:18px;" : ""}">${label}</td><td style="padding:3px 0;text-align:right;color:${strong ? "#0B3D1B" : "#555"};${strong ? "font-weight:900;font-size:18px;" : ""}">${value}</td></tr>`;
  const rows = [
    row("Subtotal", `${formatCents(data.subtotalCents)} AUD`),
    row("Delivery", data.deliveryFeeCents === 0 ? "No delivery fee" : `${formatCents(data.deliveryFeeCents)} AUD`)
  ];
  if (data.gstCents > 0) rows.push(row("Included GST", `${formatCents(data.gstCents)} AUD`));
  rows.push(row("Total paid", `${formatCents(data.totalCents)} AUD`, true));
  return `<table style="width:100%;border-collapse:collapse;margin-top:16px;border-top:2px solid #0B3D1B;font-size:14px;">${rows.join("")}</table>`;
}

function emailShell(heading: string, intro: string, data: OrderEmailData): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#FFFDF9;border:1px solid #EFE8DC;border-radius:16px;padding:28px;">
      <div style="text-align:center;padding-bottom:20px;border-bottom:2px solid #0B3D1B;">
        <h1 style="color:#0B3D1B;margin:0;font-size:26px;font-weight:900;">FRESH STOP</h1>
        <p style="color:#7A2E1E;margin:4px 0 0;font-size:13px;font-weight:bold;text-transform:uppercase;">Sydney Farm Fresh Produce &amp; Groceries</p>
      </div>
      <div style="padding:24px 0;">
        <h2 style="color:#0B3D1B;font-size:20px;margin-top:0;">${escapeHtml(heading)}</h2>
        <p style="color:#444;font-size:15px;line-height:1.6;">${intro}</p>
        <div style="background:#F4EFE6;border-radius:12px;padding:16px;margin:20px 0;font-size:14px;color:#0B3D1B;">${fulfilmentLines(data)}</div>
        <h3 style="color:#0B3D1B;font-size:16px;">Order Items</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="color:#0B3D1B;"><th style="text-align:left;padding:8px 0;">Product</th><th style="padding:8px 0;">Qty</th><th style="text-align:right;padding:8px 0;">Price</th><th style="text-align:right;padding:8px 0;">Total</th></tr></thead>
          <tbody>${itemRows(data.items)}</tbody>
        </table>
        ${totalsBlock(data)}
      </div>
      <div style="border-top:1px solid #EFE8DC;padding-top:20px;text-align:center;font-size:13px;color:#777;">
        <p style="margin:0;">Need help with your order? Contact Fresh Stop Sydney</p>
        <p style="margin:4px 0 0;"><strong>Phone:</strong> ${escapeHtml(CONTACT.phoneDisplay)} | <strong>Email:</strong> ${escapeHtml(CONTACT.email)}</p>
      </div>
    </div>`;
}

/** Customer email. Only ever rendered for PAID orders. */
export function renderCustomerEmail(data: OrderEmailData): string {
  const tracking = data.trackingUrl ? `<p><a href="${escapeHtml(data.trackingUrl)}" rel="noreferrer">Track your order securely</a> (link valid for 30 days). Keep this link private.</p>` : "";
  const intro = `Hi ${escapeHtml(data.customerName)},<br />Thank you for shopping with Fresh Stop. We have received your payment.${tracking}`;
  return emailShell("Payment received", intro, data);
}

export function renderBusinessEmail(data: OrderEmailData): string {
  const contact = `<p style="font-size:14px;color:#333;"><strong>Customer:</strong> ${escapeHtml(data.customerName)}<br /><strong>Phone:</strong> ${escapeHtml(data.customerPhone)}<br /><strong>Email:</strong> ${escapeHtml(data.customerEmail)}</p>`;
  return emailShell("New paid online order", contact, data);
}

interface RawOrderItem {
  name?: unknown;
  unit?: unknown;
  quantity?: unknown;
  priceCents?: unknown;
  totalCents?: unknown;
}

function legacyItems(itemsJson: string): EmailLineItem[] {
  try {
    const parsed: unknown = JSON.parse(itemsJson || "[]");
    if (!Array.isArray(parsed)) return [];
    return (parsed as RawOrderItem[]).map((i) => ({
      name: typeof i.name === "string" ? i.name : "Item",
      unit: typeof i.unit === "string" ? i.unit : "each",
      quantity: typeof i.quantity === "number" ? i.quantity : 1,
      unitPriceCents: typeof i.priceCents === "number" ? i.priceCents : 0,
      totalCents: typeof i.totalCents === "number" ? i.totalCents : 0
    }));
  } catch {
    return [];
  }
}

const dollarsToCents = (dollars: number): number => Math.round(dollars * 100);

async function loadEmailData(orderId: string): Promise<{ data: OrderEmailData; paid: boolean; revision: number } | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true, storeBranch: { select: { name: true, suburb: true } } }
  });
  if (!order) return null;
  const items: EmailLineItem[] = order.orderItems.length
    ? order.orderItems.map((i) => ({
        name: i.name,
        unit: i.unit,
        quantity: i.quantity,
        unitPriceCents: i.priceCents,
        totalCents: i.totalCents
      }))
    : legacyItems(order.itemsJson);
  const data: OrderEmailData = {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    fulfillmentType: order.fulfillmentType,
    deliveryAddress: order.deliveryAddress,
    deliverySuburb: order.deliverySuburb,
    deliveryPostcode: order.deliveryPostcode,
    deliveryNotes: order.deliveryNotes,
    preferredDeliveryDate: order.preferredDeliveryDate,
    pickupLocation: order.storeBranch ? `${order.storeBranch.name}, ${order.storeBranch.suburb}` : null,
    items,
    subtotalCents: dollarsToCents(order.subtotal),
    deliveryFeeCents: dollarsToCents(order.deliveryFee),
    gstCents: dollarsToCents(order.gstTotal),
    totalCents: order.totalCents || dollarsToCents(order.total)
  };
  const trackingToken = createOrderTrackingToken(order, order.emailAccessIssuedAt.getTime());
  if (trackingToken) {
    const trackingUrl = new URL("/orders", process.env.NEXT_PUBLIC_SITE_URL || SITE_URL);
    trackingUrl.hash = new URLSearchParams({ order: order.orderNumber, t: trackingToken }).toString();
    data.trackingUrl = trackingUrl.toString();
  }
  return { data, paid: order.paymentStatus === "PAID" && !["CANCELLED", "PENDING_PAYMENT"].includes(order.orderStatus), revision: order.emailRevision };
}

type ClaimColumn = "confirmationEmailSentAt" | "businessEmailSentAt";
const LEASE_MS = 5 * 60 * 1000;
const leaseColumn = (column: ClaimColumn) => column === "confirmationEmailSentAt" ? "confirmationEmailClaimedAt" : "businessEmailClaimedAt";

/** Atomic renewable lease; delivery is recorded only after provider acknowledgement. */
async function claim(orderId: string, column: ClaimColumn, revision: number): Promise<Date | null> {
  const claimedAt = new Date();
  const lease = leaseColumn(column);
  const result = await db.order.updateMany({
    where: { id: orderId, paymentStatus: "PAID", orderStatus: { notIn: ["CANCELLED", "PENDING_PAYMENT"] }, emailRevision: revision, [column]: null,
      OR: [{ [lease]: null }, { [lease]: { lt: new Date(claimedAt.getTime() - LEASE_MS) } }] },
    data: { [lease]: claimedAt }
  });
  return result.count === 1 ? claimedAt : null;
}

async function releaseClaim(orderId: string, column: ClaimColumn, claimedAt: Date): Promise<void> {
  const lease = leaseColumn(column);
  await db.order.updateMany({ where: { id: orderId, [lease]: claimedAt }, data: { [lease]: null } });
}

async function claimAndSend(
  orderId: string,
  column: ClaimColumn,
  transport: EmailTransport,
  message: OutboundEmail,
  revision: number
): Promise<EmailSendStatus> {
  const claimedAt = await claim(orderId, column, revision);
  if (!claimedAt) return { sent: false, reason: "ALREADY_SENT" };
  try {
    await transport({ ...message, idempotencyKey: `fs-${orderId}-${column}-${revision}` });
    const lease = leaseColumn(column);
    const recorded = await db.order.updateMany({
      where: { id: orderId, emailRevision: revision, [lease]: claimedAt },
      data: { [column]: new Date(), [lease]: null }
    });
    if (recorded.count !== 1) return { sent: false, reason: "SEND_FAILED" };
    return { sent: true };
  } catch (error) {
    // Log only the error class, never the message (may echo recipient data).
    console.error(`[email] ${column} send failed: ${error instanceof Error ? error.name : "UnknownError"}`);
    await releaseClaim(orderId, column, claimedAt).catch(() => undefined);
    return { sent: false, reason: "SEND_FAILED" };
  }
}

export function senderAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "Fresh Stop <orders@freshstop.com.au>";
}

export function businessRecipient(): string {
  return process.env.ORDERS_NOTIFICATION_EMAIL || "info@freshstop.com.au";
}

/**
 * Sends eligible paid-order emails using atomic leases and provider idempotency keys.
 * Never throws: failures are returned (and the claim cleared so a later call can retry).
 * `force` clears both sent markers first (admin "resend").
 */
export async function resendOrderEmails(orderId: string, options: { force?: boolean } = {}): Promise<OrderEmailResult> {
  try {
    let loaded = await loadEmailData(orderId);
    if (!loaded) return { customer: { sent: false, reason: "NOT_FOUND" }, business: { sent: false, reason: "NOT_FOUND" } };
    if (!loaded.paid) return { customer: { sent: false, reason: "NOT_PAID" }, business: { sent: false, reason: "NOT_PAID" } };
    const transport = resolveTransport();
    if (!transport) {
      return { customer: { sent: false, reason: "NOT_CONFIGURED" }, business: { sent: false, reason: "NOT_CONFIGURED" } };
    }
    if (options.force) {
      const stale = new Date(Date.now() - LEASE_MS);
      const reset = await db.order.updateMany({ where: { id: orderId, AND: [
        { OR: [{ confirmationEmailClaimedAt: null }, { confirmationEmailClaimedAt: { lt: stale } }] },
        { OR: [{ businessEmailClaimedAt: null }, { businessEmailClaimedAt: { lt: stale } }] }
      ] }, data: { confirmationEmailSentAt: null, businessEmailSentAt: null, confirmationEmailClaimedAt: null, businessEmailClaimedAt: null, emailRevision: { increment: 1 }, emailAccessIssuedAt: new Date() } });
      if (!reset.count) return { customer: { sent: false, reason: "IN_PROGRESS" }, business: { sent: false, reason: "IN_PROGRESS" } };
      loaded = await loadEmailData(orderId);
      if (!loaded) return { customer: { sent: false, reason: "NOT_FOUND" }, business: { sent: false, reason: "NOT_FOUND" } };
    }
    const emailRevision = loaded.revision;
    const { data } = loaded;
    const from = senderAddress();
    const customer = await claimAndSend(orderId, "confirmationEmailSentAt", transport, {
      from,
      to: [data.customerEmail],
      subject: sanitizeSubject(`Fresh Stop payment received #${data.orderNumber}`),
      html: renderCustomerEmail(data)
    }, emailRevision);
    const business = await claimAndSend(orderId, "businessEmailSentAt", transport, {
      from,
      to: [businessRecipient()],
      subject: sanitizeSubject(`[New paid order] #${data.orderNumber} (${formatCents(data.totalCents)})`),
      html: renderBusinessEmail(data)
    }, emailRevision);
    return { customer, business };
  } catch (error) {
    console.error(`[email] order email pipeline failed: ${error instanceof Error ? error.name : "UnknownError"}`);
    return { customer: { sent: false, reason: "SEND_FAILED" }, business: { sent: false, reason: "SEND_FAILED" } };
  }
}

/** Bounded recovery for provider failures or a worker dying after claiming a message. */
export async function retryPendingOrderEmails(limit = 20): Promise<{ attempted: number; failed: number }> {
  if (!resolveTransport()) return { attempted: 0, failed: 0 };
  const stale = new Date(Date.now() - LEASE_MS);
  const orders = await db.order.findMany({
    where: { paymentStatus: "PAID", orderStatus: { notIn: ["CANCELLED", "PENDING_PAYMENT"] }, OR: [
      { confirmationEmailSentAt: null, OR: [{ confirmationEmailClaimedAt: null }, { confirmationEmailClaimedAt: { lt: stale } }] },
      { businessEmailSentAt: null, OR: [{ businessEmailClaimedAt: null }, { businessEmailClaimedAt: { lt: stale } }] }
    ] },
    orderBy: { updatedAt: "asc" }, take: Math.min(100, Math.max(1, Math.trunc(limit))), select: { id: true }
  });
  let failed = 0;
  for (const order of orders) {
    const result = await resendOrderEmails(order.id);
    if (result.customer.reason === "SEND_FAILED" || result.business.reason === "SEND_FAILED") failed++;
  }
  return { attempted: orders.length, failed };
}
