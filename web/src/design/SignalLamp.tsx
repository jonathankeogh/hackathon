import type { CSSProperties } from "react";
import "./design.css";
import { useFlashOnChange } from "./motion";
import { colors, lampSizes, type LampSize } from "./tokens";

export type LampState = "red" | "amber" | "green" | "off";

export interface SignalLampProps {
  state: LampState;
  /** sm 16, md 24 (default), lg 40 px, ring included. */
  size?: LampSize;
  /** Play a short scale-and-fade flash whenever `state` changes. */
  flash?: boolean;
  /** Blink on and off like a waiting signal. Static under reduced motion. */
  blink?: boolean;
  /** Accessible name. Without it the lamp is decorative (aria-hidden). */
  label?: string;
  style?: CSSProperties;
}

const FILL: Record<LampState, string> = {
  red: colors.red,
  amber: colors.amber,
  green: colors.green,
  off: colors.divider,
};

function ringGap(size: LampSize): number {
  return size === "sm" ? 1.5 : size === "md" ? 2 : 3;
}

/**
 * A signal lamp: a flat disc inside a 2.5px outline ring. No glow. `off` is the unlit lens
 * (divider colour). The colour is a fill; put the meaning in a label next to it too.
 */
export function SignalLamp({ state, size = "md", flash = false, blink = false, label, style }: SignalLampProps) {
  const flashing = useFlashOnChange(flash ? state : null);
  const px = lampSizes[size];
  const classes = ["ds-lamp", flashing ? "ds-lamp-flash" : "", blink ? "ds-lamp-blink" : ""].filter(Boolean).join(" ");
  return (
    <span
      className={classes}
      data-state={state}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: px, height: px, padding: ringGap(size), backgroundColor: FILL[state], ...style }}
    />
  );
}
