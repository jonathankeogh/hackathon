import { useEffect, useState } from "react";

export interface Viewport {
  width: number;
  height: number;
}

function read(): Viewport {
  return typeof window === "undefined" ? { width: 390, height: 844 } : { width: window.innerWidth, height: window.innerHeight };
}

/** The window size, kept current on resize. */
export function useViewport(): Viewport {
  const [viewport, setViewport] = useState(read);
  useEffect(() => {
    const onResize = () => setViewport(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return viewport;
}

/** True once `active` has held for `ms`; resets when it turns false. */
export function useAfter(ms: number, active: boolean): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    setElapsed(false);
    if (!active) return;
    const id = window.setTimeout(() => setElapsed(true), ms);
    return () => window.clearTimeout(id);
  }, [ms, active]);
  return elapsed;
}
