import type { CSSProperties } from "react";
import { Mascot, LeafShape, type MascotKind } from "@/components/motion";

const SPARKS = [
  { dx: -64, dy: -46, c: "#2ecc1f", d: 0 }, { dx: 58, dy: -52, c: "#f8d65b", d: 30 },
  { dx: -80, dy: 6, c: "#e98828", d: 60 }, { dx: 78, dy: 10, c: "#e10606", d: 20 },
  { dx: -34, dy: -74, c: "#f8d65b", d: 50 }, { dx: 30, dy: -78, c: "#2ecc1f", d: 80 },
  { dx: -52, dy: 40, c: "#e10606", d: 40 }, { dx: 50, dy: 44, c: "#e98828", d: 70 }
];

function Basket() {
  return (
    <svg viewBox="0 0 88 68" width="100%" height="100%" focusable="false" aria-hidden="true">
      <circle cx="28" cy="22" r="11" fill="#e10606" stroke="#ac0909" strokeWidth="2" />
      <circle cx="50" cy="18" r="10" fill="#e98828" stroke="#97400b" strokeWidth="2" />
      <path d="M62 30 C62 14 72 8 80 8 C80 22 74 30 62 30Z" fill="#2ecc1f" stroke="#0f6b1f" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 30 H80 L72 62 Q71 66 66 66 H22 Q17 66 16 62 Z" fill="#e0a95a" stroke="#97400b" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M22 38 V62 M34 38 V64 M46 38 V64 M58 38 V64 M70 38 V62" stroke="#97400b" strokeWidth="2" opacity=".55" />
      <path d="M26 30 C26 4 62 4 62 30" fill="none" stroke="#97400b" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function Bubble() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" focusable="false" aria-hidden="true">
      <path d="M4 10 Q4 6 8 6 H32 Q36 6 36 10 V24 Q36 28 32 28 H20 L12 35 V28 H8 Q4 28 4 24 Z" fill="#fff" stroke="#0f6b1f" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M10 13 L20 20 L30 13" fill="none" stroke="#0f6b1f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Decorative, aria-hidden, about 1.1s: a produce basket pops in, a message bubble flies towards the chosen
 * contact option, a mascot waves goodbye and a small burst pops. Transform/opacity only.
 */
export function EnquiryEffects({ mascot }: { mascot: MascotKind }) {
  return (
    <span aria-hidden="true" className="enq-fx-root">
      <span className="enq-fx enq-basket"><Basket /></span>
      <span className="enq-fx enq-envelope"><Bubble /></span>
      <span className="enq-fx enq-wave"><Mascot kind={mascot} animation="wave" size={56} /></span>
      <span className="enq-fx enq-wave" style={{ left: "6%", right: "auto", width: 24, height: 24, top: "8%", bottom: "auto" }}><LeafShape className="h-full w-full" /></span>
      {SPARKS.map((s, i) => (
        <span key={i} className="enq-fx enq-spark" style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, "--c": s.c, "--d": `${s.d}ms` } as CSSProperties} />
      ))}
    </span>
  );
}
