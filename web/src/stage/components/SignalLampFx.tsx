import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useReducedMotion } from "../motion/useReducedMotion";
import { colors } from "../tokens";

export interface SignalLampFxProps {
  /** Goes true for the moment a lamp is switched (see useCascade `flashing`). */
  flash: boolean;
  /** Lamp centre in SVG user units; the clunk scales around it. */
  cx: number;
  cy: number;
  /** Lamp disc radius in SVG user units. */
  r: number;
  /** Scale reached at the middle of the clunk. 1.05 for a lamp switch. */
  peak?: number;
  /** Duration of the scale clunk in seconds. */
  clunkS?: number;
  /** Show the fg flash disc fading out over the lamp. Off for the PLAN pulse. */
  overlay?: boolean;
  children: ReactNode;
}

/**
 * SVG wrapper for one signal lamp. On `flash` it does the lamp-switch flash
 * (fg disc fading out over 250ms onto the green lamp beneath) and the 1.05 clunk. Opacity and
 * scale only. Not under reduced motion.
 */
export function SignalLampFx({ flash, cx, cy, r, peak = 1.05, clunkS = 0.18, overlay = true, children }: SignalLampFxProps) {
  // Reduced motion: the colour still changes (the lamp), but with no flash and no scale.
  const reduced = useReducedMotion();
  const active = flash && !reduced;
  return (
    <motion.g
      style={{ transformOrigin: `${cx}px ${cy}px` }}
      initial={false}
      animate={active ? { scale: [1, peak, 1] } : { scale: 1 }}
      transition={active ? { duration: clunkS, ease: "linear" } : { duration: 0 }}
    >
      {children}
      {overlay && (
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill={colors.text}
          pointerEvents="none"
          initial={false}
          animate={active ? { opacity: [1, 0] } : { opacity: 0 }}
          transition={active ? { duration: 0.25, ease: "easeOut" } : { duration: 0 }}
        />
      )}
    </motion.g>
  );
}
