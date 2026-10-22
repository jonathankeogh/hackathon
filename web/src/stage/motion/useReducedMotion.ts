import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function read(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * True under `prefers-reduced-motion: reduce`. Split-flaps, the odometer, word reveals and
 * the cascade flash then render their end state immediately.
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
