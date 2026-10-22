import { motion } from "framer-motion";
import { useReducedMotion } from "../motion/useReducedMotion";
import { SETTLE_FADE_MS, useSettleKey } from "../motion/useSettleKey";
import { alphas, fonts, tracking, type } from "../tokens";

export interface OdometerProps {
  value: number;
  target: number;
  /** Font size of the value digits in px. */
  size?: number;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function DigitColumn({ digit, size }: { digit: number; size: number }) {
  const reduced = useReducedMotion();
  // Settle-net: shortly after the roll should have ended, remount at the end position.
  const { key: settleKey } = useSettleKey(SETTLE_FADE_MS, digit);
  return (
    <span
      className="relative inline-block overflow-hidden"
      style={{ height: size, width: size * 0.62, lineHeight: 1 }}
    >
      <motion.span
        key={settleKey}
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={false}
        animate={{ y: `${-digit * 10}%` }}
        transition={{ duration: reduced ? 0 : 0.35, ease: "easeOut" }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block text-center" style={{ height: size, lineHeight: `${size}px` }}>
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function Number_({ n, size }: { n: number; size: number }) {
  const chars = String(Math.max(0, Math.trunc(n))).split("");
  return (
    <span className="inline-flex" style={{ fontVariantNumeric: "tabular-nums", fontSize: size }}>
      {chars.map((c, i) => (
        // keyed from the right so the ones column keeps rolling when digits are added
        <DigitColumn key={chars.length - i} digit={Number(c)} size={size} />
      ))}
    </span>
  );
}

/** The attendee count: the rolling value at display size, with "/ target" beneath it. */
export function Odometer({ value, target, size = type.display }: OdometerProps) {
  return (
    <div data-testid="odometer" aria-label={`${value} of ${target} attendees`} style={{ fontFamily: fonts.mono }}>
      <div style={{ fontSize: type.label, fontWeight: 600, opacity: alphas.read }}>ATTENDEES</div>
      <div style={{ marginTop: 8, fontWeight: 600, letterSpacing: tracking.display }}>
        <Number_ n={value} size={size} />
      </div>
      <div style={{ marginTop: 4, fontSize: type.title, fontWeight: 600, opacity: alphas.read, whiteSpace: "nowrap" }}>
        {`/ ${target}`}
      </div>
    </div>
  );
}
