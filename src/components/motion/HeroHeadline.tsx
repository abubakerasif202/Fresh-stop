import type { CSSProperties } from "react";

/** Headline with a staggered CSS word entrance. Text is always in the DOM and readable without JS. */
export function HeroHeadline() {
  const words = [
    { w: "Fresh", tone: "text-forest" },
    { w: "Produce.", tone: "text-forest" },
    { w: "Brighter", tone: "text-brand-red" },
    { w: "Living.", tone: "text-brand-red" }
  ];
  return (
    <h1 className="hero-title">
      {words.map(({ w, tone }, i) => (
        <span key={w} className="hero-word-wrap">
          <span className={`hero-word ${tone}`} style={{ "--i": i } as CSSProperties}>{w}</span>
          {i < words.length - 1 ? " " : ""}
          {i === 1 ? <br /> : null}
        </span>
      ))}
    </h1>
  );
}
