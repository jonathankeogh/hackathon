import "../design/design.css";

export interface OdometerProps {
  value: number;
  /** Minimum number of digit columns (zero padded). Default 1. */
  digits?: number;
  /** Plex Mono digits that roll like a mechanical counter. Size comes from the parent font-size. */
  className?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** The digit columns of a value, most significant first, zero padded to `digits`. */
export function odometerDigits(value: number, digits = 1): number[] {
  const safe = Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
  return Array.from(String(safe).padStart(digits, "0"), Number);
}

/**
 * An odometer: every digit is a column of 0 to 9 that slides to its value with a plain CSS
 * transition (translate only). Under reduced motion the digit changes at once. Sized by the
 * font-size of its parent: a column is 1em tall and 0.62em wide.
 */
export function Odometer({ value, digits = 1, className }: OdometerProps) {
  const cols = odometerDigits(value, digits);
  return (
    <span className={["ds-odo", className ?? ""].filter(Boolean).join(" ")} role="img" aria-label={String(Math.max(0, Math.trunc(value)))}>
      {cols.map((digit, i) => (
        // keyed from the right so the ones column keeps rolling when a digit is added
        <span key={cols.length - i} className="ds-odo-col" aria-hidden>
          <span className="ds-odo-strip" data-digit={digit} style={{ transform: `translateY(-${digit}em)` }}>
            {DIGITS.map((d) => (
              <span key={d} className="ds-odo-cell">
                {d}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
