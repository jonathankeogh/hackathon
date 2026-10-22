import type { Commitment, Condition } from "@deadlock/shared/types";
import type { Ask } from "../data/v2types";

/** What the stage has seen of one commitment's requires: now, and what they were before. */
export interface RequiresEntry {
  current: readonly Condition[];
  /** The requires just before the latest change, or null if the stage never saw a change. */
  previous: readonly Condition[] | null;
}
export type RequiresHistory = ReadonlyMap<string, RequiresEntry>;

export interface ChangedCondition {
  resource: string;
  /** Old condition as shown, e.g. "15+". */
  from: string;
  /** New condition as shown, e.g. "12+". */
  to: string;
}

export function formatCondition(c: Condition): string {
  return typeof c.minCount === "number" ? `${c.minCount}+` : c.resource;
}

function same(a: readonly Condition[], b: readonly Condition[]): boolean {
  return a.length === b.length && a.every((x, i) => x.resource === b[i]?.resource && x.minCount === b[i]?.minCount);
}

/**
 * Folds the latest commitments into the history. Returns the same object when nothing
 * changed, so it can drive derived React state without looping. Commitments that are gone
 * are forgotten.
 */
export function nextHistory(prev: RequiresHistory, commitments: readonly Commitment[]): RequiresHistory {
  const next = new Map<string, RequiresEntry>();
  let changed = prev.size !== commitments.length;
  for (const c of commitments) {
    const before = prev.get(c.id);
    if (before === undefined) {
      next.set(c.id, { current: c.requires, previous: null });
      changed = true;
    } else if (same(before.current, c.requires)) {
      next.set(c.id, before);
    } else {
      next.set(c.id, { current: c.requires, previous: before.current });
      changed = true;
    }
  }
  return changed ? next : prev;
}

/**
 * The struck-through old condition and the new one for a commitment an accepted ask has
 * changed, or null. Needs the stage to have seen the old condition; a stage that only ever
 * saw the new state (a reload) shows nothing struck.
 */
export function changedCondition(history: RequiresHistory, asks: readonly Ask[] | undefined, commitmentId: string): ChangedCondition | null {
  const ask = asks?.find((a) => a.status === "accepted" && a.proposal.commitmentId === commitmentId);
  const entry = history.get(commitmentId);
  if (ask === undefined || entry === undefined || entry.previous === null) return null;
  if (!same(entry.current, ask.proposal.requires)) return null;
  for (const now of entry.current) {
    const old = entry.previous.find((p) => p.resource === now.resource);
    if (old !== undefined && old.minCount !== now.minCount) {
      return { resource: now.resource, from: formatCondition(old), to: formatCondition(now) };
    }
  }
  return null;
}
