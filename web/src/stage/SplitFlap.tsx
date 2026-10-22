import { useEffect, useRef, useState, type CSSProperties } from "react";

// Departures-board split-flap, built like the real thing: each cell has a
// top and bottom half. On a change the old top half falls away and the new
// bottom half swings down; a few random glyphs pass before it settles.

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:-";
const STEP_MS = 90;

function Half({ ch, side, h, className = "", style }: { ch: string; side: "top" | "bottom"; h: number; className?: string; style?: CSSProperties }) {
  return (
    <span
      className={`absolute inset-x-0 overflow-hidden bg-[var(--flap-face)] ${side === "top" ? "top-0" : "bottom-0"} ${className}`}
      style={{ height: h / 2, ...style }}
    >
      <span
        className="absolute inset-x-0 text-center"
        style={{ height: h, lineHeight: `${h}px`, top: side === "top" ? 0 : -h / 2 }}
      >
        {ch}
      </span>
    </span>
  );
}

function FlapCell({ target, index, size }: { target: string; index: number; size: number }) {
  const [cur, setCur] = useState(target);
  const [prev, setPrev] = useState(target);
  const [flip, setFlip] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shown = useRef(target);

  useEffect(() => {
    if (target === shown.current) return;
    timers.current.forEach(clearTimeout);
    const flips = 2 + ((index * 7) % 4);
    const seq = Array.from({ length: flips }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
    seq.push(target);
    timers.current = seq.map((ch, i) =>
      setTimeout(() => {
        setPrev(shown.current);
        setCur(ch);
        shown.current = ch;
        setFlip((f) => f + 1);
      }, index * 24 + i * STEP_MS),
    );
    return () => timers.current.forEach(clearTimeout);
  }, [target, index]);

  const w = Math.round(size * 0.74);
  const h = Math.round(size * 1.3);
  const flipping = flip > 0 && prev !== cur;
  return (
    <span
      className="relative inline-block font-mono leading-none [perspective:240px]"
      style={{ width: w, height: h, fontSize: size, ["--flap-ms" as string]: `${STEP_MS}ms` }}
      aria-hidden
    >
      {/* resting faces: new top, old bottom (until the new bottom lands over it) */}
      <Half ch={cur} side="top" h={h} />
      <Half ch={flipping ? prev : cur} side="bottom" h={h} />
      {flipping && (
        <>
          <Half key={`f${flip}`} ch={prev} side="top" h={h} className="flap-fall z-10" />
          <Half key={`l${flip}`} ch={cur} side="bottom" h={h} className="flap-land z-10" />
        </>
      )}
      {/* the hinge between the two halves */}
      <span className="absolute inset-x-0 top-1/2 z-20 h-px -translate-y-px bg-bg" />
    </span>
  );
}

export function SplitFlap({
  text,
  length,
  size,
  className = "",
  testId,
}: {
  text: string;
  length: number;
  size: number;
  className?: string;
  testId?: string;
}) {
  const cells = text.toUpperCase().padEnd(length).slice(0, length).split("");
  return (
    <span className={`inline-flex gap-[3px] ${className}`} aria-label={text} data-testid={testId} data-value={text}>
      {cells.map((ch, i) => (
        <FlapCell key={i} index={i} target={ch} size={size} />
      ))}
    </span>
  );
}

/** Break a long title into board lines of at most `width` characters. */
export function boardLines(text: string, width: number, maxLines = 2): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.toUpperCase().split(/\s+/)) {
    if (!line) line = word;
    else if ((line + " " + word).length <= width) line += " " + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = (kept[maxLines - 1] + " " + lines.slice(maxLines).join(" ")).slice(0, width - 1) + ".";
    return kept;
  }
  return lines;
}
