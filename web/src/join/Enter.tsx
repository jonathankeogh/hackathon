import type { ReactNode } from "react";
import { useEntering } from "../design";
import "./join.css";

/**
 * Wraps one screen. Mount it with `key={screen}` so each screen plays an entrance on arrival:
 * "slide" brings a card up from below, "rise" is the short default. The class drops on a timer
 * (settle-net) and never applies under reduced motion.
 */
export function Enter({ children, kind = "rise" }: { children: ReactNode; kind?: "rise" | "slide" }) {
  const entering = useEntering(kind === "slide" ? 360 : 400);
  const cls = entering ? (kind === "slide" ? "jn-enter-slide" : "ds-enter-rise") : undefined;
  return <div className={cls}>{children}</div>;
}
