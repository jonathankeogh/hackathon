import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { colors, withAlpha } from "../tokens";
import { useReducedMotion } from "../motion/useReducedMotion";
import { AUDIENCE_ID, PLAN_ID, type TrackConnector, type TrackLayout } from "./layout";
import { chamferPath, type Point } from "./route";

// The plan as a train (CLAUDE.md section 8): it rolls in and waits at the red
// audience signal; when the PLAN signal lights, its headlamp switches on and
// it runs the actual line, round the corners, out of the panel.

const LEAD_IN = 160;
const LEAD_OUT = 200;
const CHAMFER = 12;
const SCALE = 1.25;
const ARRIVE_MS = 1500;
const LAMP_MS = 520;
const RUN_MS = 2600;

type Phase = "arrive" | "held" | "lamp" | "run" | "gone";

/** The main line: the longest chain of connectors from the audience gate to PLAN. */
function mainLine(layout: TrackLayout): Point[] | null {
  const out = new Map<string, TrackConnector[]>();
  for (const c of layout.connectors) out.set(c.fromId, [...(out.get(c.fromId) ?? []), c]);
  let best: TrackConnector[] | null = null;
  const walk = (id: string, path: TrackConnector[], seen: Set<string>) => {
    if (id === PLAN_ID) {
      if (!best || path.length > best.length) best = path;
      return;
    }
    for (const c of out.get(id) ?? []) {
      if (seen.has(c.toId)) continue;
      walk(c.toId, [...path, c], new Set(seen).add(c.toId));
    }
  };
  walk(AUDIENCE_ID, [], new Set([AUDIENCE_ID]));
  const chain = best as TrackConnector[] | null;
  if (!chain?.length) return null;
  const audience = layout.nodes.find((n) => n.id === AUDIENCE_ID)!;
  const plan = layout.nodes.find((n) => n.id === PLAN_ID)!;
  return [
    { x: -LEAD_IN, y: audience.lampY },
    { x: audience.lampX, y: audience.lampY },
    ...chain.flatMap((c) => c.points),
    { x: plan.lampX, y: plan.lampY },
    { x: layout.width + LEAD_OUT, y: plan.lampY },
  ];
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t ** 2.4;

export function TrainOnLine({ layout, go }: { layout: TrackLayout; go: boolean }) {
  const reduced = useReducedMotion();
  const points = useMemo(() => mainLine(layout), [layout]);
  const d = points ? chamferPath(points, CHAMFER) : "";
  const pathRef = useRef<SVGPathElement>(null);
  const trainRef = useRef<SVGGElement>(null);
  const audience = layout.nodes.find((n) => n.id === AUDIENCE_ID);
  // Where the nose waits: just before the audience lamp housing.
  const heldAt = audience ? LEAD_IN + audience.lampX - layout.metrics.housingR - 12 : 0;
  // A stage opened after the line cleared shows no train.
  const [phase, setPhase] = useState<Phase>(() => (go ? "gone" : reduced ? "held" : "arrive"));
  const s = useRef(phase === "arrive" ? 0 : heldAt);

  const place = (dist: number) => {
    const path = pathRef.current;
    const g = trainRef.current;
    // No path measuring outside a real browser (jsdom in tests): leave it be.
    if (!path || !g || typeof path.getTotalLength !== "function") return;
    const total = path.getTotalLength();
    const at = Math.max(0, Math.min(total, dist));
    const p = path.getPointAtLength(at);
    const a = path.getPointAtLength(Math.max(0, at - 2));
    const b = path.getPointAtLength(Math.min(total, at + 2));
    const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    g.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${deg}) scale(${SCALE})`);
  };

  // Keep the train on the line when the layout moves (new signals, wider columns).
  useLayoutEffect(() => {
    if (phase === "held" || phase === "lamp") s.current = heldAt;
    place(s.current);
  });

  // Phase changes from the cascade: lit → headlamp → run; back to held on reset.
  useEffect(() => {
    if (go && (phase === "held" || phase === "arrive")) setPhase(reduced ? "gone" : "lamp");
    if (!go && phase === "gone") {
      s.current = heldAt;
      setPhase("held");
    }
  }, [go, phase, reduced, heldAt]);

  useEffect(() => {
    if (phase === "lamp") {
      const t = setTimeout(() => setPhase("run"), LAMP_MS);
      return () => clearTimeout(t);
    }
    if (phase !== "arrive" && phase !== "run") return;
    const from = s.current;
    const path = pathRef.current;
    const to = phase === "arrive" ? heldAt : path && typeof path.getTotalLength === "function" ? path.getTotalLength() : 0;
    const ms = phase === "arrive" ? ARRIVE_MS : RUN_MS;
    const ease = phase === "arrive" ? easeOut : easeIn;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      s.current = from + (to - from) * ease(t);
      place(s.current);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setPhase(phase === "arrive" ? "held" : "gone");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!points) return null;
  const lit = phase === "lamp" || phase === "run";
  const line = { stroke: withAlpha("text", 0.7), strokeWidth: 1.4, fill: colors.bg } as const;
  return (
    <g data-testid="train" data-train={phase}>
      <path ref={pathRef} d={d} fill="none" stroke="none" />
      <g ref={trainRef} style={{ display: phase === "gone" ? "none" : undefined }}>
        {/* drawn nose at the origin, facing along the line; wheels sit on the rail */}
        <path d="M-96 -7V-31Q-96 -35 -92 -35H-18L0 -20V-7Z" {...line} />
        <line x1={-92} y1={-15} x2={-2} y2={-15} stroke={withAlpha("text", 0.22)} />
        {[-86, -70, -54].map((x) => (
          <rect key={x} x={x} y={-30} width={11} height={8} fill="none" stroke={withAlpha("text", 0.35)} />
        ))}
        <path d="M-31 -30H-18L-9 -22H-31Z" fill="none" stroke={withAlpha("text", 0.45)} />
        {[-82, -66, -30, -14].map((x) => (
          <circle key={x} cx={x} cy={-4} r={4.5} {...line} />
        ))}
        <circle cx={-93.5} cy={-11} r={2.2} fill={colors.red} />
        {lit ? (
          <g className="train-headlamp">
            {/* no glow (design rules): a bright lamp with a lit ring */}
            <circle cx={-2} cy={-11} r={6} fill="none" stroke={withAlpha("text", 0.35)} />
            <circle cx={-2} cy={-11} r={3.4} fill={colors.text} />
          </g>
        ) : (
          <circle cx={-2} cy={-11} r={3} fill={withAlpha("text", 0.12)} />
        )}
      </g>
    </g>
  );
}
