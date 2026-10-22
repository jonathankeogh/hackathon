import type { CSSProperties, ReactNode } from "react";
import "./design.css";

export interface MarqueeProps {
  children: ReactNode;
  /** Seconds for one full loop. Default 48. */
  seconds?: number;
  /** Run right to left (default) or the other way. */
  reverse?: boolean;
  /** Accessible name for the row; the repeated copy is hidden from assistive tech. */
  label?: string;
  className?: string;
}

/**
 * A ticker that loops its children forever with a linear translate. The children are rendered
 * twice (the second copy is aria-hidden) so the loop is seamless. Pauses on hover where hover
 * exists. Under reduced motion it does not move: one static copy that wraps onto several lines.
 */
export function Marquee({ children, seconds = 48, reverse = false, label, className }: MarqueeProps) {
  return (
    <div
      className={["ds-marquee", className ?? ""].filter(Boolean).join(" ")}
      data-reverse={reverse || undefined}
      role="group"
      aria-label={label}
      style={{ "--ds-marquee-s": `${seconds}s` } as CSSProperties}
    >
      <div className="ds-marquee-track">
        <div className="ds-marquee-group">{children}</div>
        <div className="ds-marquee-group" aria-hidden data-copy="true">
          {children}
        </div>
      </div>
    </div>
  );
}
