import type { ReactNode } from "react";

export type MascotKind = "strawberry" | "banana" | "carrot" | "apple" | "orange" | "broccoli";

const INK = "#183323";
const CHEEK = "#ff8f8f";

interface Pt { x: number; y: number }

/** Blinking eyes + smile. `mx`/`my` locate the mouth centre; eyes sit above it. */
export function Face({ eyes, mouth, gap = 9, spark = true }: { eyes: Pt; mouth: Pt; gap?: number; spark?: boolean }): ReactNode {
  const eye = (cx: number) => (
    <g className="mascot-eye">
      <ellipse cx={cx} cy={eyes.y} rx={3.4} ry={4.4} fill={INK} />
      {spark && <circle cx={cx + 1.1} cy={eyes.y - 1.5} r={1.2} fill="#fff" />}
    </g>
  );
  return (
    <g>
      {eye(eyes.x - gap)}
      {eye(eyes.x + gap)}
      <ellipse cx={eyes.x - gap - 5} cy={mouth.y - 2} rx={3.6} ry={2.2} fill={CHEEK} opacity={0.55} />
      <ellipse cx={eyes.x + gap + 5} cy={mouth.y - 2} rx={3.6} ry={2.2} fill={CHEEK} opacity={0.55} />
      <path d={`M${mouth.x - 5} ${mouth.y} Q${mouth.x} ${mouth.y + 6.5} ${mouth.x + 5} ${mouth.y}`} fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
    </g>
  );
}

const Shine = ({ d }: { d: string }) => <path d={d} fill="#fff" opacity={0.38} />;
const Leaf = ({ d, fill }: { d: string; fill: string }) => <path d={d} fill={fill} stroke="#0b3d1b" strokeOpacity={0.35} strokeWidth={1.2} strokeLinejoin="round" />;

/** Gradient defs; ids are namespaced per instance so several mascots can share a page. */
function Defs({ id }: { id: string }): ReactNode {
  const stops = (a: string, b: string) => (<><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></>);
  return (
    <defs>
      <radialGradient id={`${id}-red`} cx="35%" cy="30%" r="80%">{stops("#ff5a4a", "#c70808")}</radialGradient>
      <radialGradient id={`${id}-orange`} cx="35%" cy="30%" r="80%">{stops("#ffb347", "#e07a10")}</radialGradient>
      <linearGradient id={`${id}-carrot`} x1="0" y1="0" x2="0.4" y2="1">{stops("#ff9a3c", "#e0600a")}</linearGradient>
      <linearGradient id={`${id}-banana`} x1="0" y1="0" x2="1" y2="1">{stops("#ffe873", "#f2b822")}</linearGradient>
      <radialGradient id={`${id}-broc`} cx="40%" cy="30%" r="80%">{stops("#3fd42b", "#0f6b1f")}</radialGradient>
      <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">{stops("#4be03a", "#0f6b1f")}</linearGradient>
    </defs>
  );
}

export function MascotArt({ kind, id, face }: { kind: MascotKind; id: string; face: boolean }): ReactNode {
  const fill = (n: string) => `url(#${id}-${n})`;
  const leafFill = fill("leaf");
  switch (kind) {
    case "apple":
      return (<><Defs id={id} />
        <path d="M50 30 C46 20 44 14 40 10" stroke="#7a4a1d" strokeWidth={4} strokeLinecap="round" fill="none" />
        <Leaf d="M52 24 C60 10 76 12 80 16 C76 28 62 32 52 24Z" fill={leafFill} />
        <path d="M50 30 C38 20 12 28 12 54 C12 78 32 94 50 89 C68 94 88 78 88 54 C88 28 62 20 50 30Z" fill={fill("red")} />
        <Shine d="M22 44 C22 34 30 30 36 30 C30 34 28 40 28 48Z" />
        {face && <Face eyes={{ x: 50, y: 56 }} mouth={{ x: 50, y: 68 }} />}</>);
    case "strawberry":
      return (<><Defs id={id} />
        <path d="M50 92 C22 78 10 56 15 38 C20 24 38 22 50 28 C62 22 80 24 85 38 C90 56 78 78 50 92Z" fill={fill("red")} />
        {[[24, 44], [76, 44], [30, 66], [70, 66], [50, 82]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx={1.8} ry={2.6} fill="#ffe873" opacity={0.9} />)}
        <Leaf d="M50 30 L36 14 L46 22 L50 8 L54 22 L64 14Z" fill={leafFill} />
        <Leaf d="M30 28 C38 24 44 28 50 30 C42 36 34 34 30 28Z M70 28 C62 24 56 28 50 30 C58 36 66 34 70 28Z" fill={leafFill} />
        <Shine d="M24 40 C26 32 32 30 38 30 C32 34 30 40 30 46Z" />
        {face && <Face eyes={{ x: 50, y: 52 }} mouth={{ x: 50, y: 64 }} />}</>);
    case "carrot":
      return (<><Defs id={id} />
        <Leaf d="M50 30 C40 18 34 8 36 4 C46 6 50 20 50 30Z" fill={leafFill} />
        <Leaf d="M50 30 C50 16 54 4 60 2 C64 10 56 22 50 30Z" fill={leafFill} />
        <Leaf d="M50 30 C58 20 70 14 76 16 C72 26 60 32 50 30Z" fill={leafFill} />
        <path d="M24 36 C24 26 76 26 76 36 C76 58 60 82 50 96 C40 82 24 58 24 36Z" fill={fill("carrot")} />
        <path d="M30 52 L38 52 M62 62 L70 62 M42 76 L50 76" stroke="#b44a05" strokeOpacity={0.45} strokeWidth={2.4} strokeLinecap="round" />
        <Shine d="M30 36 C30 32 34 31 38 31 C34 36 34 42 34 48Z" />
        {face && <Face eyes={{ x: 50, y: 46 }} mouth={{ x: 50, y: 58 }} />}</>);
    case "banana":
      return (<><Defs id={id} />
        <path d="M30 14 C22 16 20 26 22 38 C24 68 42 92 78 88 C92 86 92 70 80 70 C62 68 50 52 50 32 C50 20 44 12 30 14Z" fill={fill("banana")} stroke="#c98a0a" strokeOpacity={0.5} strokeWidth={1.6} strokeLinejoin="round" />
        <rect x={26} y={8} width={9} height={9} rx={2.5} fill="#7a4a1d" />
        <path d="M82 78 C86 78 88 82 84 84" stroke="#7a4a1d" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Shine d="M25 34 C25 26 28 22 31 22 C29 28 29 34 30 40Z" />
        {face && <Face eyes={{ x: 36, y: 44 }} mouth={{ x: 36, y: 55 }} gap={7} />}</>);
    case "orange":
      return (<><Defs id={id} />
        <circle cx={50} cy={56} r={36} fill={fill("orange")} />
        {[[24, 70], [76, 70], [30, 80], [70, 82], [50, 88]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={1.3} fill="#b85a08" opacity={0.5} />)}
        <Leaf d="M52 22 C58 10 74 10 78 14 C74 26 60 28 52 22Z" fill={leafFill} />
        <path d="M50 22 L50 17" stroke="#0f6b1f" strokeWidth={3.2} strokeLinecap="round" />
        <Shine d="M24 46 C24 34 32 28 40 28 C32 34 30 40 30 52Z" />
        {face && <Face eyes={{ x: 50, y: 54 }} mouth={{ x: 50, y: 66 }} />}</>);
    case "broccoli":
      return (<><Defs id={id} />
        <path d="M36 58 C36 70 34 84 32 92 L68 92 C66 84 64 70 64 58Z" fill="#8fdc5a" stroke="#4aa02a" strokeOpacity={0.5} strokeWidth={1.4} />
        {[[30, 40, 18], [50, 28, 21], [70, 40, 18], [40, 50, 16], [60, 50, 16]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill={fill("broc")} />)}
        <Shine d="M38 18 C42 14 48 14 52 16 C46 17 42 20 40 24Z" />
        {face && <Face eyes={{ x: 50, y: 66 }} mouth={{ x: 50, y: 77 }} gap={8} />}</>);
  }
}
