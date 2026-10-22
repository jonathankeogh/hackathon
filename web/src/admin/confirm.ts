/** How long the first tap of a destructive action stays armed. */
export const CONFIRM_WINDOW_MS = 4000;

export interface ConfirmState {
  armed: string | null;
  at: number;
}

export const NOT_ARMED: ConfirmState = { armed: null, at: 0 };

export const isArmed = (state: ConfirmState, id: string, now: number): boolean =>
  state.armed === id && now - state.at <= CONFIRM_WINDOW_MS;

/**
 * Two-tap confirm. The first tap on `id` arms it; a second tap on the same id inside the window
 * fires. A tap on another id, or after the window, arms that one instead. Pure: no timers here.
 */
export function pressConfirm(state: ConfirmState, id: string, now: number): { next: ConfirmState; fire: boolean } {
  if (isArmed(state, id, now)) return { next: NOT_ARMED, fire: true };
  return { next: { armed: id, at: now }, fire: false };
}
