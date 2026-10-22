import { useEffect, useRef, useState } from "react";

// Departures-board split-flap: each cell flips through a few glyphs before
// settling on its target, staggered left to right.

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:-";
const STEP_MS = 55;

function FlapCell({ target, index, size }: { target: string; index: number; size: number }) {
  const [shown, setShown] = useState(target);
  const [tick, setTick] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (target === shown) return;
    timers.current.forEach(clearTimeout);
    // A few random glyphs, then the target. Later cells start a touch later.
    const flips = 3 + ((index * 7) % 4);
    const seq = Array.from({ length: flips }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
    seq.push(target);
    timers.current = seq.map((ch, i) =>
      setTimeout(() => {
        setShown(ch);
        setTick((t) => t + 1);
      }, index * 22 + i * STEP_MS),
    );
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const w = Math.round(size * 0.74);
  return (
    <span
      className="relative inline-flex items-center justify-center bg-fg/[0.06] font-mono leading-none [perspective:300px]"
      style={{ width: w, height: Math.round(size * 1.3), fontSize: size }}
    >
      <span key={tick} className="flap">{shown === " " ? " " : shown}</span>
      {/* the split between the two flaps */}
      <span className="absolute inset-x-0 top-1/2 h-px bg-bg" />
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
    <span className={`inline-flex gap-[2px] ${className}`} aria-label={text} data-testid={testId} data-value={text}>
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
