import { useEffect, useRef } from "react";
import type { Commitment, Condition, State } from "@deadlock/shared/types";

// The dependency view as a railway line: a gate signal for each outside
// condition (attendees), one signal per commitment, track between them, and
// the PLAN signal at the end of the line. Drawn in SVG; no graph library.

type Aspect = "red" | "amber" | "green" | "off";

interface Node {
  id: string;
  kind: "gate" | "signal" | "plan";
  col: number;
  lane: number;
  aspect: Aspect;
  commitment?: Commitment;
  title: string; // big word beside the signal
  name: string; // small caps above it
  condition?: string;
  conditionMet?: boolean;
  asking?: boolean; // the agent is asking this person to bend
  quote?: string;
}

interface Edge {
  from: string;
  to: string;
  live: boolean;
}

const W = 820;
const TOP = 150; // track y of lane 0
const LANE_H = 236;
const LEFT = 26;
const RIGHT = 128; // room for the PLAN label inside the column

const COLOR: Record<Aspect, string> = {
  red: "var(--color-signal-red)",
  amber: "var(--color-signal-amber)",
  green: "var(--color-signal-green)",
  off: "var(--color-rule)",
};

function condText(c: Condition) {
  return c.minCount ? `${c.resource} ≥ ${c.minCount}` : c.resource;
}

function layout(state: State) {
  const commitments = state.commitments;
  const plan = state.plan;
  const required = new Set(plan?.requiredForPlan ?? []);
  const providers = (resource: string) => commitments.filter((c) => c.offers === resource);
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? "";

  // Outside conditions (nobody in the chat offers them) become gate signals.
  const gates = new Map<string, number>();
  for (const c of commitments) {
    for (const r of c.requires) {
      if (!providers(r.resource).length) gates.set(r.resource, Math.max(gates.get(r.resource) ?? 0, r.minCount ?? 1));
    }
  }

  // Column = how deep in the chain a commitment sits.
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (c: Commitment): number => {
    if (depth.has(c.id)) return depth.get(c.id)!;
    if (visiting.has(c.id)) return 1;
    visiting.add(c.id);
    let d = 1;
    for (const r of c.requires) {
      const ps = providers(r.resource);
      if (ps.length) d = Math.max(d, 1 + Math.min(...ps.map(depthOf)));
    }
    visiting.delete(c.id);
    depth.set(c.id, d);
    return d;
  };
  commitments.forEach(depthOf);
  const maxDepth = Math.max(0, ...depth.values());
  const planCol = maxDepth + 1;

  // Lanes: what the plan needs rides the main line; the rest go on sidings.
  const nodes: Node[] = [];
  let gateLane = 0;
  for (const [resource, need] of gates) {
    const have = resource === "attendees" ? state.attendeeCount : 0;
    const met = have >= need;
    nodes.push({
      id: `gate:${resource}`,
      kind: "gate",
      col: 0,
      lane: gateLane++,
      aspect: met ? "green" : "red",
      name: "Audience",
      title: resource,
      condition: resource === "attendees" ? `${Math.min(have, 999)} of ${need} confirmed` : `needs ${resource}`,
      conditionMet: met,
    });
  }
  for (let col = 1; col <= maxDepth; col++) {
    const inCol = commitments
      .filter((c) => depth.get(c.id) === col)
      .sort((a, b) => Number(required.has(b.offers)) - Number(required.has(a.offers)));
    inCol.forEach((c, lane) => {
      const unlocked = c.status === "unlocked";
      const ask = state.asks?.find((a) => a.status === "open" && a.proposal.commitmentId === c.id);
      nodes.push({
        id: c.id,
        kind: "signal",
        col,
        lane,
        aspect: unlocked ? "green" : "amber",
        commitment: c,
        name: name(c.personId),
        title: c.offers,
        condition: ask
          ? `asking: ${ask.proposal.requires.map(condText).join(" + ") || "no conditions"}?`
          : c.requires.length
            ? `needs ${c.requires.map(condText).join(" + ")}`
            : "no conditions",
        conditionMet: unlocked,
        asking: Boolean(ask),
        quote: c.quote,
      });
    });
  }
  const planGreen = plan?.status === "viable" || plan?.status === "booked";
  nodes.push({
    id: "plan",
    kind: "plan",
    col: planCol,
    lane: 0,
    aspect: !plan ? "off" : planGreen ? "green" : "red",
    name: plan ? (planGreen ? "Line clear" : "Held") : "No service",
    title: "Plan",
  });

  // Track: each condition is a line from whoever provides it.
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const live = (id: string) => byId.get(id)?.aspect === "green";
  const edges: Edge[] = [];
  for (const c of commitments) {
    for (const r of c.requires) {
      const ps = providers(r.resource);
      const sources = ps.length ? ps.map((p) => p.id) : [`gate:${r.resource}`];
      for (const from of sources) edges.push({ from, to: c.id, live: live(from) });
    }
  }
  // Into PLAN: required commitments that don't feed another required one.
  const feedsRequired = (c: Commitment) => commitments.some((o) => required.has(o.offers) && o.requires.some((r) => r.resource === c.offers));
  const sinks = commitments.filter((c) => required.has(c.offers) && !feedsRequired(c));
  for (const c of sinks) edges.push({ from: c.id, to: "plan", live: live(c.id) });
  if (!sinks.length) for (const g of gates.keys()) edges.push({ from: `gate:${g}`, to: "plan", live: live(`gate:${g}`) });

  const cols = planCol + 1;
  const colW = (W - LEFT - RIGHT) / Math.max(cols - 1, 1);
  const lanes = Math.max(1, ...nodes.map((n) => n.lane + 1));
  const pos = (n: Node) => ({ x: LEFT + n.col * colW, y: TOP + n.lane * LANE_H });
  return { nodes, edges, byId, colW, pos, height: TOP + (lanes - 1) * LANE_H + 140 };
}

/** Plays a callback when a node's aspect changes (for the relay sound). */
function useAspectChanges(nodes: Node[], onChange: (n: Node) => void) {
  const prev = useRef(new Map<string, Aspect>());
  useEffect(() => {
    for (const n of nodes) {
      const before = prev.current.get(n.id);
      if (before && before !== n.aspect) onChange(n);
      prev.current.set(n.id, n.aspect);
    }
  });
}

export function TrackDiagram({ state, onSwitch }: { state: State; onSwitch?: (kind: Node["kind"], aspect: Aspect) => void }) {
  const { nodes, edges, byId, colW, pos, height } = layout(state);
  useAspectChanges(nodes, (n) => onSwitch?.(n.kind, n.aspect));

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full overflow-visible" role="img" aria-label="Track diagram" data-testid="track">
      <defs>
        <filter id="glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Track first, signals on top. */}
      {edges.map((e) => {
        const a = pos(byId.get(e.from)!);
        const b = pos(byId.get(e.to)!);
        const x1 = a.x + 16;
        const x2 = b.x - 16;
        // Sidings leave the line right before the target column, in the gap
        // between quotes, with a short turnout either end.
        const drop = x2 - 26;
        const k = 14;
        const dir = b.y > a.y ? 1 : -1;
        const d =
          a.y === b.y
            ? `M${x1} ${a.y}H${x2}`
            : `M${x1} ${a.y}H${drop - k}L${drop} ${a.y + dir * k}V${b.y - dir * k}L${drop + k} ${b.y}H${x2}`;
        return (
          <g key={`${e.from}-${e.to}`}>
            {/* sleepers */}
            <path d={d} fill="none" stroke="var(--color-fg)" strokeOpacity={0.09} strokeWidth={11} strokeDasharray="2 9" />
            <path d={d} fill="none" stroke="var(--color-fg)" strokeOpacity={0.22} strokeWidth={2} />
            <path d={d} fill="none" stroke="var(--color-signal-green)" strokeWidth={2.5} pathLength={1} className={`rail-live ${e.live ? "on" : ""}`} />
          </g>
        );
      })}

      {nodes.map((n, i) => (
        <SignalNode key={n.id} node={n} {...pos(n)} colW={colW} delay={n.col * 140 + n.lane * 90 + i * 10} />
      ))}
    </svg>
  );
}

function SignalNode({ node, x, y, colW, delay }: { node: Node; x: number; y: number; colW: number; delay: number }) {
  const isPlan = node.kind === "plan";
  const headW = isPlan ? 34 : 26;
  const headH = isPlan ? 72 : 60;
  const postH = 46;
  const headY = y - postH - headH;
  const top: Aspect = node.aspect === "red" || node.aspect === "amber" ? node.aspect : "off";
  const bottom: Aspect = node.aspect === "green" ? "green" : "off";
  const r = isPlan ? 10.5 : 8.5;
  const lampY = [headY + headH * 0.3, headY + headH * 0.7];
  // Re-key on aspect so the clunk and relay gap replay on every switch.
  const switchKey = `${node.id}:${node.aspect}`;
  const labelW = colW - 30;

  return (
    <g className="rise" style={{ animationDelay: `${delay}ms` }} data-signal={node.id} data-aspect={node.aspect}>
      {/* post and base on the track */}
      <line x1={x} y1={y} x2={x} y2={headY + headH} stroke="var(--color-fg)" strokeOpacity={0.35} strokeWidth={2} />
      <line x1={x - 8} y1={y} x2={x + 8} y2={y} stroke="var(--color-fg)" strokeOpacity={0.5} strokeWidth={3} />

      <g key={switchKey} className="clunk">
        <rect x={x - headW / 2} y={headY} width={headW} height={headH} rx={5} fill="var(--color-bg)" stroke="var(--color-fg)" strokeOpacity={0.3} />
        <Lamp cx={x} cy={lampY[0]} r={r} aspect={top} />
        <Lamp cx={x} cy={lampY[1]} r={r} aspect={bottom} animate={bottom === "green"} />
      </g>

      {/* name beside the signal */}
      <foreignObject x={x + headW / 2 + 10} y={headY - 4} width={labelW} height={headH + 10}>
        <div className="flex h-full flex-col justify-end pb-1">
          <p className="font-mono text-[12px] uppercase leading-tight tracking-[0.18em] text-fg/55">{node.name}</p>
          <p className={`font-mono font-medium uppercase leading-none tracking-[0.04em] ${isPlan ? "text-[30px]" : "text-[24px]"}`} style={{ color: node.aspect === "off" ? undefined : isPlan || node.kind === "gate" ? COLOR[node.aspect] : undefined }}>
            {node.title}
          </p>
        </div>
      </foreignObject>

      {/* condition and exact quote underneath */}
      {(node.condition || node.quote) && (
        <foreignObject x={x - 8} y={y + 14} width={labelW - 12} height={LANE_H - 120}>
          <div className="space-y-1.5">
            {node.condition && (
              <p className={`flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] ${node.conditionMet ? "text-signal-green" : node.kind === "gate" ? "text-signal-red" : "text-signal-amber"}`}>
                {node.asking && <span className="blink inline-block h-2 w-2 shrink-0 rounded-full bg-signal-amber" />}
                {node.condition}
              </p>
            )}
            {node.quote && <p className="font-mono text-[12px] leading-snug text-fg/50">“{node.quote}”</p>}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function Lamp({ cx, cy, r, aspect, animate = false }: { cx: number; cy: number; r: number; aspect: Aspect; animate?: boolean }) {
  if (aspect === "off") return <circle cx={cx} cy={cy} r={r} fill="var(--color-fg)" fillOpacity={0.07} stroke="var(--color-rule)" />;
  return (
    <g className={animate ? "lamp-on" : undefined}>
      <circle cx={cx} cy={cy} r={r * 1.6} fill={COLOR[aspect]} opacity={0.55} filter="url(#glow)" />
      <circle cx={cx} cy={cy} r={r} fill={COLOR[aspect]} />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.28} fill="var(--color-fg)" opacity={0.35} />
    </g>
  );
}
