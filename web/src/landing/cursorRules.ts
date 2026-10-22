/** When the signal-lamp cursor shows, and what colour it is. */

export interface CursorEnv {
  reducedMotion: boolean;
  /** A mouse or trackpad: (hover: hover) and (pointer: fine). */
  finePointer: boolean;
  /** The pointer has moved over the page at least once. */
  hasMoved: boolean;
  /** The pointer is inside the window. */
  inside: boolean;
}

/** Hidden on touch, hidden under reduced motion, hidden until the first move and when the pointer leaves. */
export function cursorEnabled(env: Pick<CursorEnv, "reducedMotion" | "finePointer">): boolean {
  return env.finePointer && !env.reducedMotion;
}

export function cursorVisible(env: CursorEnv): boolean {
  return cursorEnabled(env) && env.hasMoved && env.inside;
}

export const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, summary, [data-cursor="press"]';

/** Amber by default, green over anything you can press. */
export function cursorTone(target: Element | null): "amber" | "green" {
  return target?.closest?.(INTERACTIVE) ? "green" : "amber";
}

/** One lerp step toward the target; 0.4 keeps it close to the pointer without lag. */
export function follow(current: number, target: number, rate = 0.4): number {
  const next = current + (target - current) * rate;
  return Math.abs(target - next) < 0.2 ? target : next;
}
