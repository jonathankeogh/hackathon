import { useEffect, useState } from "react";
import type { EventDetails } from "@deadlock/shared/types";
import { socket } from "../../socket";
import type { StageEvent, StageEventEnvelope } from "./types";

/**
 * Subscribes to the transient socket events that are not part of State (`cascade`,
 * `booked`; `explain:chunk` is folded into the shared socket snapshot's `streamed`) and appends them to an append-only log. Listeners are removed
 * on unmount or when `enabled` turns false.
 */
export function useStageEvents(enabled: boolean): readonly StageEventEnvelope[] {
  const [events, setEvents] = useState<readonly StageEventEnvelope[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let seq = 0;
    const push = (event: StageEvent) => {
      seq += 1;
      const envelope: StageEventEnvelope = { seq, receivedAt: Date.now(), event };
      setEvents((prev) => [...prev, envelope]);
    };
    const onCascade = (p: { order: string[] }) => push({ type: "cascade", order: p.order });
    const onBooked = (event: EventDetails) => push({ type: "booked", event });

    socket.on("cascade", onCascade);
    socket.on("booked", onBooked);
    return () => {
      socket.off("cascade", onCascade);
      socket.off("booked", onBooked);
    };
  }, [enabled]);

  return events;
}
