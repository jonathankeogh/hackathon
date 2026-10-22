import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../motion/useReducedMotion";

export const REVEAL_MS_PER_WORD = 60;
/** Slack after the last word is due before the settle-net shows every word. */
const NET_MARGIN_MS = 400;

export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/**
 * Number of words of `text` to show. Streaming text shows everything it has;
 * plain text changes reveal word by word. First mount, text that just finished streaming and
 * reduced motion show every word immediately. Settle-net: a timer after the reveal should
 * have ended shows every word, whatever interrupted it.
 */
export function useWordReveal(text: string, streaming: string | null): number {
  const reduced = useReducedMotion();
  const words = splitWords(text);
  const [count, setCount] = useState(words.length);
  const lastText = useRef(text);
  const lastStreamed = useRef<string | null>(null);

  useEffect(() => {
    if (streaming !== null) {
      lastStreamed.current = streaming;
      lastText.current = text;
      return;
    }
    const total = splitWords(text).length;
    const net = window.setTimeout(() => setCount(total), total * REVEAL_MS_PER_WORD + NET_MARGIN_MS);
    if (reduced) {
      lastText.current = text;
      setCount(total);
      return () => window.clearTimeout(net);
    }
    if (text === lastText.current) return () => window.clearTimeout(net);
    lastText.current = text;
    if (lastStreamed.current !== null && splitWords(lastStreamed.current).join(" ") === splitWords(text).join(" ")) {
      lastStreamed.current = null;
      setCount(total);
      return () => window.clearTimeout(net);
    }
    lastStreamed.current = null;
    setCount(0);
    let shown = 0;
    const id = window.setInterval(() => {
      shown += 1;
      setCount(shown);
      if (shown >= total) window.clearInterval(id);
    }, REVEAL_MS_PER_WORD);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(net);
    };
  }, [text, streaming, reduced]);

  if (reduced) return words.length;
  return streaming !== null ? splitWords(streaming).length : Math.min(count, words.length);
}
