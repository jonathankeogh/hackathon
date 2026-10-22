import type { Target, TargetAndTransition, Transition } from "framer-motion";

export const ENTER_S = 0.3;
export const MOVE_S = 0.4;
export const EXIT_S = 0.25;
/** Seconds between nodes that arrive in the same batch. */
export const BATCH_STAGGER_S = 0.12;

const MOVE: Transition = { duration: MOVE_S, ease: "easeOut" };

export interface NodeMotion {
  initial: false | Target;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
}

/**
 * Motion for a node (lamp or label) at (x, y). A new node (`enter` is its batch index) fades
 * and scales in from 0.9 over 300ms, already at its place; a node that is already there glides
 * to its new place over 400ms; a removed node fades out over 250ms. Everything is ease-out or
 * linear, nothing springs. Nodes present on first mount get `enter` undefined: no animation.
 */
export function nodeMotion(x: number, y: number, enter: number | undefined): NodeMotion {
  const delay = (enter ?? 0) * BATCH_STAGGER_S;
  const fade: Transition = { duration: ENTER_S, ease: "easeOut", delay };
  return {
    initial: enter === undefined ? false : { opacity: 0, scale: 0.9, x, y },
    animate: { opacity: 1, scale: 1, x, y },
    exit: { opacity: 0, transition: { duration: EXIT_S, ease: "linear" } },
    transition: { x: MOVE, y: MOVE, opacity: fade, scale: fade },
  };
}
