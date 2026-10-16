import test from "node:test";
import assert from "node:assert/strict";
import { enquiryReducer, enquiryStatusMessage, initialEnquiryState, mascotKindFor, ENQUIRY_GUIDANCE, type EnquiryEvent, type EnquiryState } from "./enquiry-state";

const events: EnquiryEvent[] = [
  { type: "open" }, { type: "close" }, { type: "settle" },
  { type: "choose", channel: "whatsapp" }, { type: "choose", channel: "email" }
];
const FORBIDDEN = /confirm|placed|accepted|success|sent|thank|order|complete/i;

test("state machine never reaches a confirmed/order state, over every event sequence up to length 5", () => {
  const seen = new Set<string>();
  const walk = (state: EnquiryState, depth: number) => {
    assert.ok(["closed", "choosing", "opening"].includes(state.phase));
    seen.add(state.phase);
    assert.doesNotMatch(enquiryStatusMessage(state), FORBIDDEN);
    if (depth === 0) return;
    for (const e of events) walk(enquiryReducer(state, e), depth - 1);
  };
  walk(initialEnquiryState, 5);
  assert.deepEqual([...seen].sort(), ["choosing", "closed", "opening"]);
});
test("choosing a channel opens it and settle returns to the sheet", () => {
  let s = enquiryReducer(initialEnquiryState, { type: "open" });
  s = enquiryReducer(s, { type: "choose", channel: "whatsapp" });
  assert.equal(enquiryStatusMessage(s), "Opening WhatsApp…");
  const run = s.runId;
  s = enquiryReducer(s, { type: "settle" });
  assert.equal(s.phase, "choosing");
  assert.equal(enquiryStatusMessage(s), "");
  s = enquiryReducer(s, { type: "choose", channel: "email" });
  assert.equal(enquiryStatusMessage(s), "Opening your email…");
  assert.equal(s.runId, run + 1);
});
test("cannot choose while closed", () => {
  assert.equal(enquiryReducer(initialEnquiryState, { type: "choose", channel: "email" }).phase, "closed");
});
test("guidance asks for product, quantity and suburb", () => {
  assert.match(ENQUIRY_GUIDANCE, /product/);
  assert.match(ENQUIRY_GUIDANCE, /much|quantity/);
  assert.match(ENQUIRY_GUIDANCE, /suburb/);
});
test("mascot choice is deterministic", () => {
  assert.equal(mascotKindFor("Apples"), mascotKindFor("Apples"));
  assert.ok(["strawberry", "banana", "carrot", "apple", "orange", "broccoli"].includes(mascotKindFor("Bok choy & kale")));
});
