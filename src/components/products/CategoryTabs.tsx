"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "@/components/motion";
import "@/styles/catalogue-motion.css";

export interface CategoryTab { key: string; label: string; href: string }
interface Props { tabs: CategoryTab[]; activeKey: string }
interface Bar { x: number; w: number }

/**
 * Category tabs with a sliding indicator. The links are plain navigation (server-driven); a click only
 * moves the indicator optimistically so switching feels instant. Without JS the active tab keeps a static underline.
 */
export function CategoryTabs({ tabs, activeKey }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const refs = useRef(new Map<string, HTMLAnchorElement>());
  const reduced = useReducedMotion();
  const [bar, setBar] = useState<Bar | null>(null);
  const [animate, setAnimate] = useState(false);
  const [pending, setPending] = useState<{ base: string; key: string } | null>(null);
  const current = pending && pending.base === activeKey ? pending.key : activeKey;

  useEffect(() => {
    const measure = () => {
      const el = refs.current.get(current);
      const box = scroller.current;
      if (!el || !box) { setBar(null); return; }
      setBar({ x: el.offsetLeft + 12, w: Math.max(el.offsetWidth - 24, 8) });
      const target = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
      box.scrollTo({ left: Math.max(target, 0), behavior: reduced ? "auto" : "smooth" });
    };
    measure();
    const frame = requestAnimationFrame(() => setAnimate(true));
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", measure); };
  }, [current, reduced]);

  return (
    <div ref={scroller} className="cat-tabs" data-ready={bar ? "true" : "false"} data-animate={animate && !reduced ? "true" : "false"}>
      {tabs.map(tab => (
        <Link
          key={tab.key}
          href={tab.href}
          ref={el => { if (el) refs.current.set(tab.key, el); else refs.current.delete(tab.key); }}
          aria-current={activeKey === tab.key ? "page" : undefined}
          onClick={() => setPending({ base: activeKey, key: tab.key })}
          className="cat-tab"
        >
          {tab.label}
        </Link>
      ))}
      <span aria-hidden="true" className="cat-ind" style={bar ? ({ "--x": `${bar.x}px`, "--s": bar.w / 100, "--o": 1 } as CSSProperties) : undefined} />
    </div>
  );
}
