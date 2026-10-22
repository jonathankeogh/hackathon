import { useEffect, useRef, useState, type RefObject } from "react";
import { quantise, scrollProgress } from "./storyMap";

/** Live result of a media query. False where matchMedia is missing (tests). */
export function useMatch(query: string): boolean {
  const read = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  const [match, setMatch] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

export interface Size {
  w: number;
  h: number;
}

/** The content box of an element, kept current. Falls back to `fallback` where nothing is measured (tests). */
export function useElementSize<T extends HTMLElement>(fallback: Size): [RefObject<T | null>, Size] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<Size>(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: Math.round(r.width), h: Math.round(r.height) }));
    };
    read();
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(read);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return [ref, size];
}

/**
 * Progress 0..1 of a tall section whose inner panel is sticky at `stickTop` px. One passive
 * scroll listener, throttled to a frame, quantised so a no-change frame renders nothing.
 * `enabled` false pins the value at `rest` (reduced motion shows the finished picture).
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, stickTop: number, enabled: boolean, rest = 1): number {
  const [p, setP] = useState(enabled ? 0 : rest);
  useEffect(() => {
    if (!enabled) {
      setP(rest);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setP(quantise(scrollProgress(r.top, r.height, window.innerHeight, stickTop)));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ref, stickTop, enabled, rest]);
  return p;
}

/** A counter that ticks every `ms` while `active`; stays 0 when not. */
export function useTick(ms: number, active: boolean): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [ms, active]);
  return tick;
}

/** 0 when the element's top enters the viewport bottom, 1 when its bottom reaches the viewport bottom. */
export function useElementScroll(ref: RefObject<HTMLElement | null>, enabled: boolean): number {
  const [t, setT] = useState(enabled ? 0 : 1);
  useEffect(() => {
    if (!enabled) {
      setT(1);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const travelled = (window.innerHeight - r.top) / Math.max(1, r.height);
      setT(Math.round(Math.min(1, Math.max(0, travelled)) * 400) / 400);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ref, enabled]);
  return t;
}
