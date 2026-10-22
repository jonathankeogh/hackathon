import { useEffect, useState } from "react";

/** How long after its last change a fade or glide is allowed to run before it is forced to its end state. */
export const SETTLE_FADE_MS = 900;
/** Same for the track, whose nodes stagger in and whose connectors draw after them. */
export const SETTLE_TRACK_MS = 1800;

/**
 * Settle-net for animations driven by framer-motion. `ms` after mount and after every change
 * of `trigger`, the returned key bumps once. Using it as the `key` of a motion element
 * remounts that element with `initial={false}`, so it renders its end state at once: nothing
 * can be left invisible or mid-fade if a frame dropped or the tab was in the background.
 * Pick `ms` longer than the animation (delay included). `settled` is false from a change of
 * `trigger` until the timer fires, so children with their own one-shot entrance can skip it
 * when the remount (not a real change) brings them back.
 */
export function useSettleKey(ms: number, trigger: string | number | boolean = 0): { key: number; settled: boolean } {
  const [state, setState] = useState({ key: 0, settled: false });
  useEffect(() => {
    setState((s) => (s.settled ? { ...s, settled: false } : s));
    const id = window.setTimeout(() => setState((s) => ({ key: s.key + 1, settled: true })), ms);
    return () => window.clearTimeout(id);
  }, [ms, trigger]);
  return state;
}
