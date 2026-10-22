import { useMemo } from "react";
import type { StageEventEnvelope } from "../data/types";

/**
 * The `order` of the latest `cascade` event, or null before any. The array identity is the
 * event's own, so each new event gives useCascade a new order to pick up.
 */
export function useCascadeOrder(events: readonly StageEventEnvelope[]): readonly string[] | null {
  return useMemo(() => {
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const e = events[i]!.event;
      if (e.type === "cascade") return e.order;
    }
    return null;
  }, [events]);
}
