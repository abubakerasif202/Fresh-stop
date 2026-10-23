import type { Enquiry, PrismaClient } from "@prisma/client";
import { db } from "./db";
import { CONTACT } from "./contact";
import {
  businessRecipient,
  escapeHtml,
  resolveTransport,
  sanitizeSubject,
  senderAddress,
  type EmailSendStatus,
  type EmailTransport
} from "./email";

/** Owner notification for a stored enquiry. The row is the source of truth; email is a retryable side effect. */

const LEASE_MS = 5 * 60 * 1000;

export interface EnquiryEmailDeps {
  /** Null means email is not configured: report it honestly and keep the record. */
  transport: EmailTransport | null;
  client: PrismaClient;
}

export function defaultEnquiryEmailDeps(): EnquiryEmailDeps {
  return { transport: resolveTransport(), client: db };
}

const KIND_LABEL: Readonly<Record<Enquiry["kind"], string>> = { WHOLESALE: "Wholesale enquiry", CONTACT: "General enquiry" };

function field(label: string, value: string | null): string {
  if (!value) return "";
  return `<tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-weight:bold;color:#0B3D1B;white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:8px 0;color:#333;white-space:pre-wrap;word-break:break-word;">${escapeHtml(value)}</td></tr>`;
}

export function renderEnquiryEmail(enquiry: Pick<Enquiry, "kind" | "name" | "businessName" | "email" | "phone" | "products" | "estimatedQuantity" | "message" | "createdAt">): string {
  const rows = [
    field("Name", enquiry.name),
    field("Business", enquiry.businessName),
    field("Email", enquiry.email),
    field("Phone", enquiry.phone),
    field("Products", enquiry.products),
    field("Estimated quantity", enquiry.estimatedQuantity),
    field("Message", enquiry.message),
    field("Received", enquiry.createdAt.toISOString())
  ].join("");
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#FFFDF9;border:1px solid #EFE8DC;border-radius:16px;padding:28px;">
      <div style="text-align:center;padding-bottom:20px;border-bottom:2px solid #0B3D1B;">
        <h1 style="color:#0B3D1B;margin:0;font-size:26px;font-weight:900;">FRESH STOP</h1>
        <p style="color:#7A2E1E;margin:4px 0 0;font-size:13px;font-weight:bold;text-transform:uppercase;">Sydney Farm Fresh Produce &amp; Groceries</p>
      </div>
      <div style="padding:24px 0;">
        <h2 style="color:#0B3D1B;font-size:20px;margin-top:0;">New ${escapeHtml(KIND_LABEL[enquiry.kind].toLowerCase())}</h2>
        <p style="color:#444;font-size:15px;line-height:1.6;">Reply to this email to answer the customer directly.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;background:#F4EFE6;border-radius:12px;padding:16px;">${rows}</table>
      </div>
      <div style="border-top:1px solid #EFE8DC;padding-top:20px;text-align:center;font-size:13px;color:#777;">
        <p style="margin:0;">Sent from the Fresh Stop website enquiry form.</p>
        <p style="margin:4px 0 0;"><strong>Phone:</strong> ${escapeHtml(CONTACT.phoneDisplay)} | <strong>Email:</strong> ${escapeHtml(CONTACT.email)}</p>
      </div>
    </div>`;
}

/**
 * Sends the owner email at most once per enquiry using a lease claim plus a provider idempotency key.
 * emailSentAt is set only after the provider accepts the message. Never throws.
 */
export async function sendEnquiryEmail(enquiryId: string, deps: EnquiryEmailDeps = defaultEnquiryEmailDeps()): Promise<EmailSendStatus> {
  const { transport, client } = deps;
  try {
    if (!transport) return { sent: false, reason: "NOT_CONFIGURED" };
    const enquiry = await client.enquiry.findUnique({ where: { id: enquiryId } });
    if (!enquiry) return { sent: false, reason: "NOT_FOUND" };
    if (enquiry.emailSentAt) return { sent: false, reason: "ALREADY_SENT" };
    const claimedAt = new Date();
    const claim = await client.enquiry.updateMany({
      where: { id: enquiryId, emailSentAt: null, OR: [{ emailClaimedAt: null }, { emailClaimedAt: { lt: new Date(claimedAt.getTime() - LEASE_MS) } }] },
      data: { emailClaimedAt: claimedAt }
    });
    if (claim.count !== 1) return { sent: false, reason: "IN_PROGRESS" };
    try {
      await transport({
        idempotencyKey: `enquiry-${enquiry.id}`,
        from: senderAddress(),
        to: [businessRecipient()],
        replyTo: enquiry.email,
        subject: sanitizeSubject(`[${KIND_LABEL[enquiry.kind]}] ${enquiry.businessName ?? enquiry.name}`),
        html: renderEnquiryEmail(enquiry)
      });
    } catch (error) {
      console.error(`[enquiry-email] send failed: ${error instanceof Error ? error.name : "UnknownError"}`);
      await client.enquiry.updateMany({ where: { id: enquiryId, emailClaimedAt: claimedAt }, data: { emailClaimedAt: null } }).catch(() => undefined);
      return { sent: false, reason: "SEND_FAILED" };
    }
    // The provider has accepted the message. Record that; a failure here must not trigger a second send.
    await client.enquiry.updateMany({ where: { id: enquiryId, emailSentAt: null }, data: { emailSentAt: new Date(), emailClaimedAt: null } });
    return { sent: true };
  } catch (error) {
    console.error(`[enquiry-email] pipeline failed: ${error instanceof Error ? error.name : "UnknownError"}`);
    return { sent: false, reason: "SEND_FAILED" };
  }
}

/** Bounded recovery for enquiries whose email failed, was never configured, or whose worker died mid-send. */
export async function retryPendingEnquiryEmails(limit = 20, deps: EnquiryEmailDeps = defaultEnquiryEmailDeps()): Promise<{ attempted: number; failed: number }> {
  if (!deps.transport) return { attempted: 0, failed: 0 };
  const stale = new Date(Date.now() - LEASE_MS);
  const rows = await deps.client.enquiry.findMany({
    where: { emailSentAt: null, OR: [{ emailClaimedAt: null }, { emailClaimedAt: { lt: stale } }] },
    orderBy: { createdAt: "asc" },
    take: Math.min(100, Math.max(1, Math.trunc(limit))),
    select: { id: true }
  });
  let failed = 0;
  for (const row of rows) {
    const result = await sendEnquiryEmail(row.id, deps);
    if (result.reason === "SEND_FAILED") failed += 1;
  }
  return { attempted: rows.length, failed };
}
