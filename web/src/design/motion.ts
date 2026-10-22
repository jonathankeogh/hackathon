import { useEffect, useRef, useState } from "react";
import { motionTokens, settleAfter } from "./tokens";

const QUERY = "(prefers-reduced-motion: reduce)";

function read(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * True under `prefers-reduced-motion: reduce`. Components then render their end state at once.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(read);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(QUERY);
    const onChange = () => setReduced(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Settle-net for animations driven by framer-motion. `ms` after mount and after every change
 * of `trigger`, the returned key bumps once. Using it as the `key` of a motion element
 * remounts that element with `initial={false}`, so it renders its end state at once: nothing
 * can be left invisible or mid-fade if a frame dropped or the tab was in the background.
 * Pick `ms` longer than the animation (delay included). `settled` is false from a change of
 * `trigger` until the timer fires.
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

/**
 * Settle-net for CSS entrances. Returns true while a one-shot entrance should still be
 * applied (the class is on for `ms` plus the settle margin), then false: the element falls
 * back to its normal style, so it can never be left mid-fade. Always false under reduced
 * motion. Changing `trigger` plays the entrance again.
 */
export function useEntering(ms: number = motionTokens.durations.base, trigger: string | number | boolean = 0): boolean {
  const reduced = useReducedMotion();
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    setEntering(true);
    const id = window.setTimeout(() => setEntering(false), settleAfter(ms));
    return () => window.clearTimeout(id);
  }, [ms, trigger]);
  return entering && !reduced;
}

/**
 * True for `ms` after `value` changes (not on first mount), then forced back to false.
 * Always false under reduced motion. Used for the one-shot lamp flash.
 */
export function useFlashOnChange(value: unknown, ms: number = motionTokens.flashMs): boolean {
  const reduced = useReducedMotion();
  const previous = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setFlash(true);
    const id = window.setTimeout(() => setFlash(false), settleAfter(ms));
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return flash && !reduced;
}
