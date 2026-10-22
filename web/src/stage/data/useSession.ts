import { useMemo, useState } from "react";
import { initialSession, nextSession, sessionEvents } from "./session";
import type { StageEventEnvelope } from "./types";

/**
 * Tracks the current session during render (like a derived state), so the very render in
 * which a reset arrives already has the new key and the old events filtered out.
 */
export function useSession(planId: string | null, events: readonly StageEventEnvelope[]) {
  const [session, setSession] = useState(initialSession);
  const latestSeq = events.length > 0 ? events[events.length - 1]!.seq : 0;
  const next = nextSession(session, planId, latestSeq);
  if (next !== session) setSession(next);
  const scoped = useMemo(() => sessionEvents(events, next.cutoffSeq), [events, next.cutoffSeq]);
  return { key: next.key, events: scoped };
}
