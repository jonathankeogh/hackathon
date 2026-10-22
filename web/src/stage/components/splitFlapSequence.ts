export const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :-/";

export type Random = () => number;

export interface FlipPlan {
  index: number;
  delayMs: number;
  glyphs: string[];
}

export function normalizeText(text: string, length?: number): string {
  const upper = text.toUpperCase();
  if (length === undefined) return upper;
  return upper.slice(0, length).padEnd(length, " ");
}

function pickGlyph(random: Random, avoid: readonly string[]): string {
  const pool = GLYPHS.length;
  let index = Math.min(pool - 1, Math.floor(random() * pool));
  for (let guard = 0; guard < avoid.length; guard += 1) {
    if (avoid.includes(GLYPHS[index] ?? "")) index = (index + 1) % pool;
  }
  return GLYPHS[index] ?? " ";
}

/** Glyphs shown in order: `flips` random ones, then the target. */
export function buildSequence(
  from: string,
  target: string,
  flips: number,
  random: Random,
): string[] {
  const out: string[] = [];
  let prev = from;
  for (let i = 0; i < flips; i += 1) {
    const isLast = i === flips - 1;
    const next = pickGlyph(random, isLast ? [prev, target] : [prev]);
    out.push(next);
    prev = next;
  }
  out.push(target);
  return out;
}

export function planFlips(
  prev: string,
  next: string,
  staggerMs: number,
  flips: number,
  random: Random,
): FlipPlan[] {
  const plans: FlipPlan[] = [];
  for (let index = 0; index < next.length; index += 1) {
    const to = next[index] ?? " ";
    const from = prev[index] ?? " ";
    if (from === to) continue;
    plans.push({
      index,
      delayMs: index * staggerMs,
      glyphs: buildSequence(from, to, flips, random),
    });
  }
  return plans;
}
