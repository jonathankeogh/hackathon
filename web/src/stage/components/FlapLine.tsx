import { useEffect, useState } from "react";
import { SplitFlap } from "./SplitFlap";

interface Props {
  text: string;
  size: number;
  /** Blank cells for this long, then the row flips to `text`. */
  delayMs: number;
  /** Show `text` from the first render, with no flip (a reload into an already booked plan). */
  settled?: boolean;
}

/** A split-flap row that starts blank and flips in after `delayMs`, so rows can be staggered. */
export function FlapLine({ text, size, delayMs, settled = false }: Props) {
  const [ready, setReady] = useState(settled);
  useEffect(() => {
    if (settled) return;
    const id = window.setTimeout(() => setReady(true), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs, settled]);
  // The row is only as wide as its text, but keeps its height while it is still blank.
  return (
    <div style={{ minHeight: Math.round(size * 1.2) }}>
      <SplitFlap text={ready ? text : ""} size={size} stagger={14} />
    </div>
  );
}
