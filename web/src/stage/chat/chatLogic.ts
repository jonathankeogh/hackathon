import { plainCopy } from "../text/plainCopy";
import type { Commitment, Message } from "@deadlock/shared/types";

/** Commitments whose quote appears in this message's text. */
export function commitmentsForMessage(message: Message, commitments: readonly Commitment[]): Commitment[] {
  return commitments.filter((c) => c.quote.length > 0 && message.text.includes(c.quote));
}

/** Lowest opacity a chat row that is still shown can have: anything shown is meant to be read. */
export const MIN_ROW_OPACITY = 0.6;

/** Row opacity by how far up the list it sits (rank 0 = newest). Never below 60%; older rows are hidden, not dimmed further. */
export function rowOpacity(rank: number): number {
  return Math.max(MIN_ROW_OPACITY, 1 - rank * 0.1);
}

/** Stagger delay (seconds) for messages that arrive together: only unseen ids get one. */
export function staggerDelays(ids: readonly string[], seen: ReadonlySet<string>, stepSeconds: number): Map<string, number> {
  const delays = new Map<string, number>();
  let n = 0;
  for (const id of ids) {
    if (seen.has(id)) continue;
    delays.set(id, n * stepSeconds);
    n += 1;
  }
  return delays;
}

/**
 * Index of the first message that fits whole inside `available` px when stacking from the
 * newest upwards. Anything older is hidden instead of being cut through the middle.
 */
export function firstFittingIndex(heights: readonly number[], gap: number, available: number): number {
  let used = 0;
  for (let i = heights.length - 1; i >= 0; i--) {
    used += heights[i]! + (i === heights.length - 1 ? 0 : gap);
    if (used > available) return i + 1;
  }
  return 0;
}

export const DEFAULT_CHAT_HEADING = "LONDON BUILDERS";

/** The chat column heading: the live source's label (v2 `chatSource.label`), else the seeded one. */
export function chatHeading(label: string | undefined): string {
  if (label === undefined || label.trim() === "") return DEFAULT_CHAT_HEADING;
  // A dotted label from the server reads as "WHATSAPP: London Grok builders".
  return plainCopy(label.replace(/\s*[\u00b7\u2022]\s*/, ": ")).trim();
}
