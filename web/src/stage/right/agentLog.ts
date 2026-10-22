import type { Ask } from "../data/v2types";

/** How many log lines the panel keeps on screen. */
export const LOG_LINES = 4;
/** Opacity by rank from the newest line (0) upwards; in steps, never below 60%. */
const RANK_OPACITY = [1, 0.85, 0.7, 0.6] as const;
export const TYPE_MS_PER_CHAR = 22;

export interface LogLine {
  /** Position in the full log: stable while the log only grows. */
  index: number;
  text: string;
  /** 0 for the newest line. */
  rank: number;
}

/** The last `max` lines, oldest first (newest at the bottom), each with its rank. */
export function visibleLines(log: readonly string[], max = LOG_LINES): LogLine[] {
  const start = Math.max(0, log.length - max);
  return log.slice(start).map((text, i) => ({ index: start + i, text, rank: log.length - 1 - (start + i) }));
}

export function lineOpacity(rank: number): number {
  return RANK_OPACITY[Math.min(rank, RANK_OPACITY.length - 1)] ?? RANK_OPACITY[RANK_OPACITY.length - 1]!;
}

/** Characters of a line that are showing `elapsedMs` after it started typing. */
export function typedChars(elapsedMs: number, total: number, msPerChar = TYPE_MS_PER_CHAR): number {
  return Math.max(0, Math.min(total, Math.floor(elapsedMs / msPerChar)));
}

/** Once the plan is resolved an open ask is stale, so only answered asks may still show. */
export function shownAsks(asks: readonly Ask[] | undefined, resolved: boolean): readonly Ask[] | undefined {
  if (!resolved || asks === undefined) return asks;
  return asks.filter((a) => a.status !== "open");
}

/** The ask to show: the open one, else the most recent. */
export function pickAsk(asks: readonly Ask[] | undefined): Ask | null {
  if (asks === undefined || asks.length === 0) return null;
  return asks.find((a) => a.status === "open") ?? asks[asks.length - 1] ?? null;
}

/** The agent panel is hidden entirely (v1 stage) with no log and no ask. */
export function hasAgentActivity(log: readonly string[] | undefined, asks: readonly Ask[] | undefined): boolean {
  return (log?.length ?? 0) > 0 || (asks?.length ?? 0) > 0;
}

export interface AskSegment {
  text: string;
  /** The segment is the person's name; it is drawn with their colour square. */
  isName: boolean;
}

/** "ASKING PRIYA" while open; "PRIYA SAID YES" / "PRIYA SAID NO" once answered. The lamp carries the meaning. */
export function askHeading(status: Ask["status"], firstName: string): AskSegment[] {
  const name: AskSegment = { text: firstName.toUpperCase(), isName: true };
  if (status === "open") return [{ text: "ASKING", isName: false }, name];
  return [name, { text: status === "accepted" ? "SAID YES" : "SAID NO", isName: false }];
}

export function firstName(fullName: string | undefined): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0] ?? "";
  return first === "" ? "THEM" : first;
}
