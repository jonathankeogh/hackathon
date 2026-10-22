// Karaoke timing for the incoming call: the script split into words with their character
// offsets, so a speech boundary event (a char index) maps to the word being spoken.

export interface KaraokeWord {
  w: string;
  /** Index of the word's first character in the script. */
  start: number;
}

/** Pace of the highlight when the browser gives no word boundaries, in ms per word. */
export const WORD_MS = 330;

export function splitWords(script: string): KaraokeWord[] {
  let at = 0;
  return script
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const start = script.indexOf(w, at);
      at = start + w.length;
      return { w, start };
    });
}

/** The word being spoken at a character index: the last word that starts at or before it. */
export function wordIndexAt(words: readonly KaraokeWord[], charIndex: number): number {
  let idx = 0;
  while (idx + 1 < words.length && words[idx + 1].start <= charIndex) idx++;
  return idx;
}

export type WordState = "done" | "now" | "next";

export function wordState(index: number, current: number): WordState {
  return index < current ? "done" : index === current ? "now" : "next";
}

/** m:ss as mm:ss for the call timer. */
export function clockText(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
