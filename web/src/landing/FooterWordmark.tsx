import { useInView } from "../design";

const WORD = "DEADLOCK";
const CELL_W = 168;
const GAP = 8;
const CELL_H = 262;
const VIEW_W = WORD.length * CELL_W + (WORD.length - 1) * GAP;
const FILLS = ["var(--ds-red)", "var(--ds-amber)", "var(--ds-green)"] as const;

/**
 * The wordmark at full width: eight departures-board cells scaled to the viewport. Cells come
 * in one after another; on a mouse, hovering a cell fills it with a signal colour.
 */
export function FooterWordmark({ offset }: { offset: number }) {
  const [ref, seen] = useInView<SVGSVGElement>(0.2);
  return (
    <div className="lp-fword-wrap">
    <svg ref={ref} className="lp-fword" viewBox={`0 0 ${VIEW_W} ${CELL_H}`} role="img" aria-label="Deadlock" data-in={seen} style={{ transform: `translateY(${Math.round((1 - offset) * 14)}%)` }}>
      {WORD.split("").map((letter, i) => (
        <g key={i} className="lp-fcell" style={{ ["--c" as string]: FILLS[i % FILLS.length], transitionDelay: `${i * 0.06}s` }} transform={`translate(${i * (CELL_W + GAP)} 0)`}>
          <rect width={CELL_W} height={CELL_H} className="lp-fcell-box" />
          <line x1="0" x2={CELL_W} y1={CELL_H / 2} y2={CELL_H / 2} className="lp-fcell-split" />
          <text x={CELL_W / 2} y={CELL_H / 2 + 74} textAnchor="middle" fontSize={218} className="lp-fcell-letter">
            {letter}
          </text>
        </g>
      ))}
    </svg>
    </div>
  );
}
