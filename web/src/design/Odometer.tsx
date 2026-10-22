import "./design.css";
import "./odometer.css";
import { colors, fonts, fontWeights } from "./tokens";

export interface OdometerProps {
  /** The number shown. Negative and fractional values are floored to a whole number from 0. */
  value: number;
  /** Digit height in px. Digits are 0.62 of that wide. */
  size?: number;
  /** Accessible name; defaults to the number itself. */
  label?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function Column({ digit, size }: { digit: number; size: number }) {
  return (
    <span className="ds-odo-col" data-testid="odo-col" style={{ height: size, width: Math.round(size * 0.62) }}>
      <span className="ds-odo-strip" style={{ transform: `translateY(${-digit * 10}%)` }}>
        {DIGITS.map((d) => (
          <span key={d} className="ds-odo-digit" style={{ height: size, lineHeight: `${size}px` }}>
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

/** The digits of a whole number, from 0 up. */
export function digitsOf(value: number): number[] {
  return String(Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0)))
    .split("")
    .map(Number);
}

/**
 * A counter that ticks like an odometer. Columns are keyed from the right so the ones digit
 * keeps rolling when a digit is added. The slide is a CSS transition, so it always ends on the
 * value; under reduced motion it jumps.
 */
export function Odometer({ value, size = 72, label }: OdometerProps) {
  const digits = digitsOf(value);
  return (
    <span className="ds-odo" role="img" aria-label={label ?? String(digits.join(""))} style={{ fontFamily: fonts.mono, fontSize: size, fontWeight: fontWeights.semibold, color: colors.text }}>
      {digits.map((digit, i) => (
        <Column key={digits.length - i} digit={digit} size={size} />
      ))}
    </span>
  );
}
