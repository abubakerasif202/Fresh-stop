"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Mascot } from "./Mascot";
import { LeafShape } from "./Decor";
import { INTRO_AUTO_COMPLETE_MS, INTRO_STORAGE_KEY } from "./intro-logic";

const LEAVE_AT_MS = 2350;
const FADE_MS = 450;
const SKIP_FADE_MS = 220;

const COLOURS = ["#e10606", "#2ecc1f", "#f8d65b", "#e98828", "#b5f48b", "#ff8f8f"];
/** Deterministic burst: angle spread around the logo, alternating distances. */
const PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  const dist = i % 2 ? 120 : 84;
  return { dx: Math.round(Math.cos(angle) * dist), dy: Math.round(Math.sin(angle) * dist), c: COLOURS[i % COLOURS.length], d: (i % 4) * 30 };
});

/**
 * First-visit "Welcome to Fresh Stop!" opening (~2.5s). Rendered over an already-painted homepage in a
 * fixed overlay, so it never blocks load/LCP or shifts layout. Completes on its own by ~3s regardless of
 * whether the CSS animations run. No focus trap and no scroll lock.
 */
export default function IntroSequence({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  const skip = useCallback(() => {
    setLeaving(true);
    window.setTimeout(finish, SKIP_FADE_MS);
  }, [finish]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
    } catch {
      /* ignore blocked storage */
    }
    const leaveTimer = window.setTimeout(() => setLeaving(true), LEAVE_AT_MS);
    const doneTimer = window.setTimeout(finish, Math.max(INTRO_AUTO_COMPLETE_MS, LEAVE_AT_MS + FADE_MS));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [finish, skip]);

  return (
    <div data-testid="intro-overlay" className={`intro-overlay${leaving ? " is-leaving" : ""}`}>
      <div className="intro-stage" aria-hidden="true">
        <span className="intro-leaf intro-leaf-1"><LeafShape className="h-full w-full" /></span>
        <span className="intro-leaf intro-leaf-2"><LeafShape className="h-full w-full" /></span>
        <span className="intro-leaf intro-leaf-3"><LeafShape className="h-full w-full" /></span>
        <span className="intro-actor intro-carrot"><Mascot kind="carrot" animation="none" size="100%" /></span>
        <span className="intro-actor intro-apple"><Mascot kind="apple" animation="none" size="100%" /></span>
        <span className="intro-actor intro-banana"><Mascot kind="banana" animation="none" size="100%" /></span>
        <div className="intro-finale">
          <div className="intro-logo">
            <Image src="/brand/fresh-stop-logo-256.webp" alt="" width={256} height={256} unoptimized priority={false} />
            <span className="intro-gloss" />
          </div>
          <span className="intro-flourish intro-flourish-l"><LeafShape className="h-full w-full" /></span>
          <span className="intro-flourish intro-flourish-r"><LeafShape className="h-full w-full" /></span>
          {PARTICLES.map((p, i) => (
            <span key={i} className="intro-particle" style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--c": p.c, "--d": `${p.d}ms` } as CSSProperties} />
          ))}
          <p className="intro-welcome">Welcome to Fresh Stop!</p>
        </div>
      </div>
      <button type="button" data-testid="intro-skip" className="intro-skip" onClick={skip}>
        Skip intro
      </button>
    </div>
  );
}
