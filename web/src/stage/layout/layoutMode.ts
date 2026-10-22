import { useEffect, useState } from "react";

export type LayoutMode = "projector" | "phone";

/** Narrower than this is a phone layout, whichever way it is held. */
export const PHONE_MAX_WIDTH = 900;

/**
 * The phone layout for a portrait viewport or one narrower than 900px; the scaled 1920x1080
 * canvas for everything else (a projector, a laptop, a landscape tablet).
 */
export function layoutModeFor(width: number, height: number): LayoutMode {
  return width < PHONE_MAX_WIDTH || height > width ? "phone" : "projector";
}

function current(): LayoutMode {
  return typeof window === "undefined" ? "projector" : layoutModeFor(window.innerWidth, window.innerHeight);
}

/** The layout for the window, kept current on resize and rotation. */
export function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState(current);
  useEffect(() => {
    const update = () => setMode(current());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    update();
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return mode;
}
