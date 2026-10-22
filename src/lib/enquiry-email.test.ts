import "./testing/local-db-env";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { db } from "./db";
import { renderEnquiryEmail, retryPendingEnquiryEmails, sendEnquiryEmail } from "./enquiry-email";
import type { EmailTransport, OutboundEmail } from "./email";

after(async () => { await db.$disconnect(); });

async function makeEnquiry(overrides: Record<string, unknown> = {}) {
  return db.enquiry.create({
    data: { kind: "WHOLESALE", name: "Sam <b>Lee</b>", businessName: "Lee & Co", email: "sam@example.com", phone: "0423936586", products: "Tomatoes\n<script>alert(1)</script>", estimatedQuantity: "10 boxes", message: null, ...overrides }
  });
}
const recorder = () => {
  const sent: OutboundEmail[] = [];
  const transport: EmailTransport = async (m) => { sent.push(m); };
  return { sent, transport };
};

test("renders an escaped, branded owner email with reply-to and a safe subject", async () => {
  const e = await makeEnquiry({ name: "Sam\r\nBcc: x@y.com" });
  try {
    const { sent, transport } = recorder();
    const result = await sendEnquiryEmail(e.id, { transport, client: db });
    assert.deepEqual(result, { sent: true });
    const [mail] = sent;
    assert.equal(mail.replyTo, "sam@example.com");
    assert.doesNotMatch(mail.subject, /[\r\n]/);
    assert.match(mail.subject, /wholesale/i);
    assert.match(mail.html, /FRESH STOP/);
    assert.doesNotMatch(mail.html, /<script>/);
    assert.match(mail.html, /&lt;script&gt;/);
    assert.match(mail.idempotencyKey ?? "", new RegExp(e.id));
    assert.ok((await db.enquiry.findUniqueOrThrow({ where: { id: e.id } })).emailSentAt);
  } finally { await db.enquiry.delete({ where: { id: e.id } }); }
});

test("renderEnquiryEmail escapes every interpolated field", async () => {
  const e = await makeEnquiry({ businessName: '"><img src=x>', message: "<i>hi</i>" });
  try {
    const html = renderEnquiryEmail(e);
    assert.doesNotMatch(html, /<img|<i>hi/);
  } finally { await db.enquiry.delete({ where: { id: e.id } }); }
});

test("a second send is a no-op (one email per enquiry)", async () => {
  const e = await makeEnquiry();
  try {
    const { sent, transport } = recorder();
    await sendEnquiryEmail(e.id, { transport, client: db });
    const again = await sendEnquiryEmail(e.id, { transport, client: db });
    assert.deepEqual(again, { sent: false, reason: "ALREADY_SENT" });
    assert.equal(sent.length, 1);
  } finally { await db.enquiry.delete({ where: { id: e.id } }); }
});

test("concurrent sends produce exactly one provider call", async () => {
  const e = await makeEnquiry();
  try {
    const { sent, transport } = recorder();
    const slow: EmailTransport = async (m) => { await new Promise((r) => setTimeout(r, 40)); await transport(m); };
    const results = await Promise.all([1, 2, 3].map(() => sendEnquiryEmail(e.id, { transport: slow, client: db })));
    assert.equal(sent.length, 1);
    assert.equal(results.filter((r) => r.sent).length, 1);
  } finally { await db.enquiry.delete({ where: { id: e.id } }); }
});

test("provider failure keeps the record, leaves emailSentAt null, and is retryable", async () => {
  const e = await makeEnquiry();
  try {
    const failing: EmailTransport = async () => { throw new Error("provider down sam@example.com"); };
    const first = await sendEnquiryEmail(e.id, { transport: failing, client: db });
    assert.deepEqual(first, { sent: false, reason: "SEND_FAILED" });
    const row = await db.enquiry.findUniqueOrThrow({ where: { id: e.id } });
    assert.equal(row.emailSentAt, null);
    assert.equal(row.emailClaimedAt, null);
    const { sent, transport } = recorder();
    const summary = await retryPendingEnquiryEmails(50, { transport, client: db });
    assert.ok(summary.attempted >= 1);
    assert.equal(sent.length >= 1, true);
    assert.ok((await db.enquiry.findUniqueOrThrow({ where: { id: e.id } })).emailSentAt);
  } finally { await db.enquiry.delete({ where: { id: e.id } }); }
});

test("without a transport nothing is claimed or marked sent", async () => {
  const e = await makeEnquiry();
  try {
    const result = await sendEnquiryEmail(e.id, { transport: null, client: db });
    assert.deepEqual(result, { sent: false, reason: "NOT_CONFIGURED" });
    const row = await db.enquiry.findUniqueOrThrow({ where: { id: e.id } });
    assert.equal(row.emailSentAt, null);
    assert.equal(row.emailClaimedAt, null);
    assert.deepEqual(await retryPendingEnquiryEmails(5, { transport: null, client: db }), { attempted: 0, failed: 0 });
  } finally { await db.enquiry.delete({ where: { id: e.id } }); }
});

test("unknown enquiry id reports NOT_FOUND", async () => {
  const { transport } = recorder();
  assert.deepEqual(await sendEnquiryEmail("missing", { transport, client: db }), { sent: false, reason: "NOT_FOUND" });
});
