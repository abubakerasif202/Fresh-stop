import type { CSSProperties } from "react";
import { Mascot, type MascotKind } from "./Mascot";
import { FloatingParallax } from "./FloatingParallax";

const LEAF_PATH = "M12 88 C12 40 44 10 90 10 C90 56 60 88 12 88Z";

/** Small decorative leaf (aria-hidden). */
export function LeafShape({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden="true" focusable="false">
      <path d={LEAF_PATH} fill="#2ecc1f" stroke="#0f6b1f" strokeWidth={3} strokeLinejoin="round" />
      <path d="M16 84 C38 62 60 40 84 16" stroke="#0f6b1f" strokeWidth={3} fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Lemon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" width="100%" height="100%">
      <path d="M8 52 C8 30 30 18 52 22 L60 14 L62 24 C84 30 94 44 90 58 C86 78 62 86 40 82 C20 78 8 68 8 52Z" fill="#f8d65b" stroke="#e0a800" strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M24 40 C28 34 36 30 44 30" stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.6} />
    </svg>
  );
}

type FloaterKind = MascotKind | "lemon" | "leaf";
interface FloaterSpec {
  kind: FloaterKind;
  x: string;
  y: string;
  size: number;
  depth: number;
  dur: number;
  delay: number;
  /** px from the hero top on phones; omit to hide on phones (the headline spans the full width there). */
  mobileTop?: number;
}

/** Positions hug the hero edges, clear of the headline column; all sit behind page content (z-0). */
const FLOATERS: FloaterSpec[] = [
  { kind: "strawberry", x: "3%", y: "6%", size: 44, depth: 14, dur: 9, delay: 0, mobileTop: 14 },
  { kind: "leaf", x: "46%", y: "3%", size: 34, depth: 22, dur: 11, delay: -3, mobileTop: 16 },
  { kind: "orange", x: "93%", y: "10%", size: 46, depth: 18, dur: 10, delay: -5, mobileTop: 10 },
  { kind: "lemon", x: "48%", y: "88%", size: 40, depth: 26, dur: 12, delay: -2 },
  { kind: "carrot", x: "94%", y: "80%", size: 48, depth: 12, dur: 13, delay: -7 },
  { kind: "leaf", x: "2%", y: "86%", size: 38, depth: 20, dur: 10, delay: -4 },
  { kind: "strawberry", x: "55%", y: "46%", size: 30, depth: 30, dur: 14, delay: -9 },
  { kind: "orange", x: "2%", y: "48%", size: 34, depth: 16, dur: 12, delay: -6 }
];

function FloaterArt({ kind }: { kind: FloaterKind }) {
  if (kind === "lemon") return <Lemon />;
  if (kind === "leaf") return <LeafShape className="h-full w-full" />;
  return <Mascot kind={kind} animation="none" face={false} size="100%" />;
}

/**
 * Up to 8 drifting produce particles for the hero. CSS-only drift; a tiny client wrapper adds desktop
 * mouse parallax and pauses animation when off-screen or when the tab is hidden.
 */
export function FloatingProduce({ className = "" }: { className?: string }) {
  return (
    <FloatingParallax className={`floaters ${className}`.trim()}>
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          className={`floater${f.mobileTop === undefined ? " max-sm:hidden" : ""}`}
          style={{ left: f.x, "--top": f.y, "--top-m": `${f.mobileTop ?? 0}px`, width: f.size, height: f.size, "--depth": f.depth, "--dur": `${f.dur}s`, "--delay": `${f.delay}s` } as CSSProperties}
        >
          <span className="floater-drift">
            <FloaterArt kind={f.kind} />
          </span>
        </span>
      ))}
    </FloatingParallax>
  );
}

/** Animated leaf divider: leaves sprout from a thin line as it scrolls into view. */
export function LeafDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`leaf-divider sd-rise ${className}`.trim()} aria-hidden="true">
      <span className="leaf-divider-line" />
      <LeafShape className="leaf-divider-leaf leaf-a" />
      <LeafShape className="leaf-divider-leaf leaf-b" />
      <LeafShape className="leaf-divider-leaf leaf-c" />
      <span className="leaf-divider-line" />
    </div>
  );
}

/** A decorative apple that rolls once across a strip as it scrolls into view (static under reduced motion). */
export function MascotStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`mascot-strip ${className}`.trim()} aria-hidden="true">
      <span className="mascot-strip-track" />
      <span className="mascot-strip-runner">
        <Mascot kind="apple" animation="none" size={44} />
      </span>
    </div>
  );
}

/** A carrot peeking up behind a section heading. Wrap the heading in a `relative` container. */
export function PeekingCarrot({ className = "" }: { className?: string }) {
  return (
    <span className={`peeking-carrot ${className}`.trim()} aria-hidden="true">
      <Mascot kind="carrot" animation="none" size={72} />
    </span>
  );
}
