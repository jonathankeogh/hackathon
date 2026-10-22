import type { StageEventEnvelope } from "./types";

/** Which session the stage is showing: a counter that bumps when the old one is over. */
export interface Session {
  key: number;
  /** The plan id last seen, or null when there was none. */
  planId: string | null;
  /** Events at or before this sequence number belong to an earlier session. */
  cutoffSeq: number;
}

export const initialSession: Session = { key: 0, planId: null, cutoffSeq: 0 };

/**
 * A plan appearing for the first time (null to an id) continues the same session, so the
 * live flow animates. An existing plan going away or being replaced by another id ends the
 * session: the key bumps and the events seen so far are cut off.
 */
export function nextSession(prev: Session, planId: string | null, latestSeq: number): Session {
  if (planId === prev.planId) return prev;
  if (prev.planId === null) return { ...prev, planId };
  return { key: prev.key + 1, planId, cutoffSeq: latestSeq };
}

/** The events that belong to the current session. */
export function sessionEvents(events: readonly StageEventEnvelope[], cutoffSeq: number): readonly StageEventEnvelope[] {
  return cutoffSeq === 0 ? events : events.filter((e) => e.seq > cutoffSeq);
}
