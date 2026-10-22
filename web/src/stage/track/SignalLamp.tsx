import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SETTLE_FADE_MS, useSettleKey } from "../motion/useSettleKey";
import { alphas, colors, withAlpha } from "../tokens";
import type { LampStatus } from "./lampState";

export const LAMP_COLORS: Record<Exclude<LampStatus, "off">, string> = {
  red: colors.red,
  amber: colors.amber,
  green: colors.green,
};

const SWITCH = { duration: 0.15, ease: "linear" } as const;
export const RING_W = 2.5;

/** Lamp fill for a status. Colour derivation lives here and in lampState.ts, nowhere else. */
export function lampColor(status: LampStatus): string {
  return status === "off" ? withAlpha("bg", 0) : LAMP_COLORS[status];
}

interface Props {
  cx: number;
  cy: number;
  r: number;
  housingR: number;
  status: LampStatus;
  /** Fires when the lamp goes from dark to lit or back. */
  onLitChange?: (lit: boolean) => void;
}

/**
 * A signal lamp: a flat disc inside a solid outline ring (foreground at 35%). No glow, no
 * halo. Colour changes are a crisp 150ms switch.
 */
export function SignalLamp({ cx, cy, r, housingR, status, onLitChange }: Props) {
  const lit = status !== "off";
  const prevLit = useRef(lit);
  useEffect(() => {
    if (prevLit.current !== lit) onLitChange?.(lit);
    prevLit.current = lit;
  }, [lit, onLitChange]);

  const color = lampColor(status);
  // Settle-net: shortly after a colour change, remount at the final colour.
  const { key: settleKey } = useSettleKey(SETTLE_FADE_MS, status);
  return (
    <g data-testid="signal-lamp" data-status={status}>
      <circle cx={cx} cy={cy} r={housingR - RING_W / 2} fill="none" stroke={withAlpha("text", alphas.ring)} strokeWidth={RING_W} />
      <motion.circle key={settleKey} cx={cx} cy={cy} r={r} initial={false} animate={{ fill: color }} transition={SWITCH} />
    </g>
  );
}
