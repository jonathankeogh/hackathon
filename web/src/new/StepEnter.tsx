import type { ReactNode } from "react";
import { useEntering } from "../design";

/**
 * Wraps one step. Mount it with `key={step}` so each step plays a short rise-and-fade on
 * arrival. The class drops on a timer (settle-net) and never applies under reduced motion.
 */
export function StepEnter({ children }: { children: ReactNode }) {
  const entering = useEntering(400);
  return <div className={entering ? "ds-enter-rise" : undefined}>{children}</div>;
}
