import type { NodeId } from "./content";
import { CONNECTORS } from "./storyMap";

export interface Pt {
  x: number;
  y: number;
}

export interface TrackNodePos extends Pt {
  id: NodeId;
}

export interface TrackConnectorPath {
  id: string;
  from: NodeId;
  to: NodeId;
  d: string;
}

export interface TrackLayout {
  w: number;
  h: number;
  /** Phones and short panels: labels drop the quote and shrink. */
  compact: boolean;
  /** Lamp edge in px. */
  lamp: number;
  /** Label width in px. */
  labelW: number;
  nodes: Record<NodeId, TrackNodePos>;
  connectors: TrackConnectorPath[];
  /** The rail that leaves the plan signal and runs off the right edge. */
  exit: string;
}

/** Under this width or height the track uses the compact label set. */
export const COMPACT_W = 560;
export const COMPACT_H = 420;

const COLUMN_X: Record<NodeId, number> = { attendees: 0.11, venue: 0.35, speaker: 0.63, laptops: 0.63, plan: 0.89 };
const COLUMN_X_COMPACT: Record<NodeId, number> = { attendees: 0.13, venue: 0.38, speaker: 0.64, laptops: 0.64, plan: 0.86 };
const ROW_Y: Record<NodeId, number> = { attendees: 0.4, venue: 0.4, plan: 0.4, speaker: 0.08, laptops: 0.67 };

/**
 * A length of track from a to b: runs level, takes a 45 degree chamfer to the new height and
 * runs level again. Straight when both ends share a height. Returns an SVG path.
 */
export function chamferPath(a: Pt, b: Pt): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dy === 0) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  const rise = Math.abs(dy);
  // the diagonal can never be longer than the run available
  const diag = Math.min(rise, Math.abs(dx));
  const midX = a.x + dx / 2;
  const x1 = midX - Math.sign(dx) * (diag / 2);
  const x2 = midX + Math.sign(dx) * (diag / 2);
  const y2 = a.y + Math.sign(dy) * diag;
  return `M ${a.x} ${a.y} L ${x1} ${a.y} L ${x2} ${y2} L ${x2} ${b.y} L ${b.x} ${b.y}`;
}

/** Positions of the five signals and the track between them, for a panel of w by h px. */
export function trackLayout(w: number, h: number): TrackLayout {
  const compact = w < COMPACT_W || h < COMPACT_H;
  const xs = compact ? COLUMN_X_COMPACT : COLUMN_X;
  const lamp = compact ? 24 : 40;
  const nodes = {} as Record<NodeId, TrackNodePos>;
  (Object.keys(xs) as NodeId[]).forEach((id) => {
    nodes[id] = { id, x: Math.round(xs[id] * w), y: Math.round(ROW_Y[id] * h + lamp / 2) };
  });
  const connectors = CONNECTORS.map((c) => ({ ...c, d: chamferPath(nodes[c.from], nodes[c.to]) }));
  const exit = `M ${nodes.plan.x} ${nodes.plan.y} L ${w} ${nodes.plan.y}`;
  return { w, h, compact, lamp, labelW: compact ? Math.floor(w * 0.24) : Math.min(210, Math.floor(w * 0.22)), nodes, connectors, exit };
}
