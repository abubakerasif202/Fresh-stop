/**
 * Enquiry sheet state machine. Fresh Stop is enquiry-only: nothing here may ever represent an order or a
 * confirmation. The only "in flight" state is `opening` (we are handing off to WhatsApp or email).
 */
export type EnquiryChannel = "whatsapp" | "email";
export type EnquiryPhase = "closed" | "choosing" | "opening";
export interface EnquiryState { phase: EnquiryPhase; channel: EnquiryChannel | null; runId: number }
export type EnquiryEvent =
  | { type: "open" }
  | { type: "close" }
  | { type: "choose"; channel: EnquiryChannel }
  | { type: "settle" };

export const initialEnquiryState: EnquiryState = { phase: "closed", channel: null, runId: 0 };
/** Decorative animation length; the state settles back to `choosing` afterwards. */
export const ENQUIRY_ANIMATION_MS = 1200;

export function enquiryReducer(state: EnquiryState, event: EnquiryEvent): EnquiryState {
  switch (event.type) {
    case "open": return state.phase === "closed" ? { ...state, phase: "choosing", channel: null } : state;
    case "close": return { ...state, phase: "closed", channel: null };
    case "choose": return state.phase === "closed" ? state : { phase: "opening", channel: event.channel, runId: state.runId + 1 };
    case "settle": return state.phase === "opening" ? { ...state, phase: "choosing", channel: null } : state;
  }
}

export function enquiryStatusMessage(state: EnquiryState): string {
  if (state.phase !== "opening") return "";
  return state.channel === "email" ? "Opening your email…" : "Opening WhatsApp…";
}

export const ENQUIRY_GUIDANCE = "Tell us the product, how much you need and your delivery suburb.";

const MASCOT_ROTATION = ["strawberry", "banana", "carrot", "apple", "orange", "broccoli"] as const;
/** Deterministic friendly mascot per product so the same card always waves the same character. */
export function mascotKindFor(seed: string): (typeof MASCOT_ROTATION)[number] {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return MASCOT_ROTATION[hash % MASCOT_ROTATION.length];
}
