"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "./intro-logic";

const LERP = 0.08;

/**
 * Wraps floating particles. Adds (1) pause when off-screen / tab hidden via `data-paused`, and
 * (2) mouse parallax through --mx/--my (fine pointers only, never with reduced motion), rAF-throttled.
 */
export function FloatingParallax({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let onScreen = true;
    const syncPause = () => el.setAttribute("data-paused", String(!onScreen || document.hidden));
    const io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([e]) => {
            onScreen = e.isIntersecting;
            syncPause();
          })
        : null;
    io?.observe(el);
    document.addEventListener("visibilitychange", syncPause);

    const mm = window.matchMedia.bind(window);
    const canParallax = !prefersReducedMotion(mm) && mm("(hover: hover) and (pointer: fine)").matches;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    const tick = () => {
      cx += (tx - cx) * LERP;
      cy += (ty - cy) * LERP;
      el.style.setProperty("--mx", cx.toFixed(3));
      el.style.setProperty("--my", cy.toFixed(3));
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!onScreen) return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    if (canParallax) window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", syncPause);
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {children}
    </div>
  );
}
