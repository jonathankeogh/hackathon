import { useCallback, useEffect, useState } from "react";
import { CONFIRM_WINDOW_MS, NOT_ARMED, isArmed, pressConfirm, type ConfirmState } from "./confirm";

/**
 * Two-tap confirm for destructive buttons, in place (no browser dialogs). `press(id, fire)` arms
 * on the first tap and calls `fire` on the second; the armed state lapses on its own.
 */
export function useConfirmTwice() {
  const [state, setState] = useState<ConfirmState>(NOT_ARMED);

  useEffect(() => {
    if (state.armed === null) return;
    const id = window.setTimeout(() => setState(NOT_ARMED), CONFIRM_WINDOW_MS);
    return () => window.clearTimeout(id);
  }, [state]);

  const press = useCallback(
    (id: string, fire: () => void) => {
      const result = pressConfirm(state, id, Date.now());
      setState(result.next);
      if (result.fire) fire();
    },
    [state],
  );

  return { press, armed: (id: string) => isArmed(state, id, Date.now()) };
}
