import { useEffect, useState } from "react";
import { useReducedMotion } from "../motion/useReducedMotion";
import { typedChars, TYPE_MS_PER_CHAR } from "./agentLog";

const TICK_MS = 16;
const NET_MARGIN_MS = 400;

/** Characters of `text` showing, typed at a fixed rate when `animate`, otherwise all at once. */
export function useTypedLength(text: string, animate: boolean): number {
  const reduced = useReducedMotion();
  const typed = animate && !reduced;
  const [shown, setShown] = useState(typed ? 0 : text.length);
  useEffect(() => {
    if (!typed) {
      setShown(text.length);
      return;
    }
    const start = performance.now();
    const id = window.setInterval(() => {
      const n = typedChars(performance.now() - start, text.length, TYPE_MS_PER_CHAR);
      setShown(n);
      if (n >= text.length) window.clearInterval(id);
    }, TICK_MS);
    // Settle-net: show the whole line once typing should have finished, however the interval fared.
    const net = window.setTimeout(() => setShown(text.length), text.length * TYPE_MS_PER_CHAR + NET_MARGIN_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(net);
    };
  }, [text, typed]);
  return typed ? shown : text.length;
}
