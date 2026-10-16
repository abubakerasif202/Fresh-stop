import { useId } from "react";
import { MascotArt, type MascotKind } from "./mascot-art";

export type { MascotKind };
export type MascotAnimation = "bounce" | "dance" | "wave" | "roll" | "blink" | "celebrate" | "none";

export interface MascotProps {
  kind: MascotKind;
  animation?: MascotAnimation;
  /** CSS width/height in px (number) or any CSS length. Defaults to 96. */
  size?: number | string;
  className?: string;
  /** When provided the mascot is exposed to assistive tech with this label; otherwise decorative. */
  title?: string;
  /** Set false for a faceless version (used by floating particles). */
  face?: boolean;
}

/**
 * Inline-SVG produce mascot. Motion is pure CSS (`.mascot-*` in globals.css, transform/opacity only)
 * and is disabled by prefers-reduced-motion. Server-component safe.
 */
export function Mascot({ kind, animation = "blink", size = 96, className = "", title, face = true }: MascotProps) {
  const id = `m${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const dim = typeof size === "number" ? `${size}px` : size;
  const a11y = title ? ({ role: "img", "aria-label": title } as const) : ({ "aria-hidden": true } as const);
  return (
    <span className={`mascot mascot-${animation} ${className}`.trim()} data-mascot={kind} style={{ width: dim, height: dim }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" focusable="false" {...a11y}>
        {title ? <title>{title}</title> : null}
        <MascotArt kind={kind} id={id} face={face} />
      </svg>
    </span>
  );
}
