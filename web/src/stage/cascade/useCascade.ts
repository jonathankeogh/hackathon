import type { State } from "@deadlock/shared/types";
import { useEffect, useRef, useState } from "react";
import { CascadeSequencer, initialSnapshot, type CascadeHooks, type CascadeSnapshot } from "./sequencer";

export type { CascadeSnapshot } from "./sequencer";

/**
 * Feeds the latest State (and the optional `cascade` socket event order) through
 * the sequencer. Returns what the stage should display right now.
 */
export function useCascade(
  state: State,
  order: readonly string[] | null = null,
  hooks: CascadeHooks = {},
): CascadeSnapshot {
  const [snap, setSnap] = useState<CascadeSnapshot>(() => initialSnapshot(state));
  const seq = useRef<CascadeSequencer | null>(null);
  const latest = useRef(state);
  const hooksRef = useRef(hooks);
  latest.current = state;
  hooksRef.current = hooks;

  useEffect(() => {
    const s = new CascadeSequencer(latest.current, setSnap, {
      onReveal: (id) => hooksRef.current.onReveal?.(id),
      onPlanLit: () => hooksRef.current.onPlanLit?.(),
    });
    seq.current = s;
    return () => {
      s.dispose();
      seq.current = null;
    };
  }, []);

  useEffect(() => {
    seq.current?.update(state);
  }, [state]);

  useEffect(() => {
    if (order !== null) seq.current?.setOrder(order);
  }, [order]);

  return snap;
}
