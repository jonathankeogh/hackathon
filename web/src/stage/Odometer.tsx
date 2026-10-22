// Digits roll like a mechanical counter instead of swapping.

export function Odometer({ value, minDigits = 2, className = "" }: { value: number; minDigits?: number; className?: string }) {
  const digits = String(Math.max(0, value)).padStart(minDigits, "0").split("");
  return (
    <span className={`inline-flex tabular-nums ${className}`} aria-label={String(value)}>
      {digits.map((d, i) => (
        <span key={digits.length - i} className="relative inline-block h-[1em] overflow-hidden leading-none" aria-hidden>
          <span
            className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.45,0,0.2,1)]"
            style={{ transform: `translateY(-${Number(d)}em)` }}
          >
            {"0123456789".split("").map((n) => (
              <span key={n} className="h-[1em] leading-none">{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
