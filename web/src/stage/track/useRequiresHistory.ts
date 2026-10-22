import { useState } from "react";
import type { Commitment } from "@deadlock/shared/types";
import { nextHistory, type RequiresHistory } from "./conditionDiff";

/**
 * Remembers every commitment's requires as the stage sees them change, so an accepted ask can
 * show the old condition struck through. Derived during render (the history object only
 * changes when a condition does), so the label is right on the very render the change lands.
 */
export function useRequiresHistory(commitments: readonly Commitment[]): RequiresHistory {
  const [history, setHistory] = useState<RequiresHistory>(() => nextHistory(new Map(), commitments));
  const next = nextHistory(history, commitments);
  if (next !== history) setHistory(next);
  return next;
}
