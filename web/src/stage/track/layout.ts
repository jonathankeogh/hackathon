import type { State } from "@deadlock/shared/types";
import {
  AUDIENCE_ID, PLAN_ID, assignColumns, buildGraph, reduceEdges,
  type GraphEdge, type GraphNode, type NodeKind,
} from "./graph";
import { phoneType, type } from "../tokens";
import { chamferPath, chooseRun, dedupe, type Box, type Point } from "./route";

/** The 45% centre column at 1920x1080, below the 160px departures strip. */
export const PANEL_W = 864;
export const PANEL_H = 920;

const PAD_X = 24;
const AREA_TOP = 56;
const AREA_BOTTOM = 864;
const LANE_TOP = 40;
const LANE_BOTTOM = PANEL_H - 40;
const MAX_SLOT = 370;
const AUDIENCE_W = 116;
const PLAN_W = 84;
const COMMIT_W_MAX = 210;
const COMMIT_W_MIN = 96;
const CHANNEL_BASE = 16;
const LANE_PITCH = 6;
const CHAMFER = 12;
const LANE_CLEARANCE = 22;

/** Sizes of one lamp-and-label node. The compact set is used when a column holds more than four. */
export interface Metrics {
  housingR: number;
  lampR: number;
  nodeH: number;
  labelGap: number;
  nameSize: number;
  nameLine: number;
  offerSize: number;
  offerLine: number;
  quoteSize: number;
  quoteLine: number;
  quoteGap: number;
  /** Quote lines shown before clamping. */
  quoteLines: number;
}

export const LARGE: Metrics = {
  housingR: 32, lampR: 24, nodeH: 196, labelGap: 10,
  nameSize: type.label, nameLine: 22, offerSize: type.body, offerLine: 30, quoteSize: type.small, quoteLine: 19, quoteGap: 6, quoteLines: 3,
};
export const COMPACT: Metrics = {
  housingR: 24, lampR: 17, nodeH: 134, labelGap: 4,
  nameSize: type.label, nameLine: 22, offerSize: type.label, offerLine: 22, quoteSize: type.small, quoteLine: 17, quoteGap: 4, quoteLines: 2,
};

/** Landscape flows left to right (the projector). Portrait flows top to bottom (a phone). */
export type Orientation = "landscape" | "portrait";

export interface LayoutOptions {
  orientation?: Orientation;
  /** Portrait only: the width in px the track has to fit. */
  width?: number;
  /** Portrait only: leave room above the first signal for the train waiting at it (default true). */
  trainRoom?: boolean;
}

export interface TrackNode {
  id: string;
  kind: NodeKind;
  commitmentId?: string;
  col: number;
  row: number;
  /** Position in left-to-right, top-to-bottom order, for staggered entrances. */
  order: number;
  x: number;
  y: number;
  w: number;
  h: number;
  lampX: number;
  lampY: number;
  /** Where the text block sits: under the lamp in landscape, beside it in portrait. */
  labelX: number;
  labelY: number;
  labelW: number;
}

export interface TrackConnector {
  id: string;
  fromId: string;
  toId: string;
  resource: string;
  points: Point[];
  path: string;
}

export interface TrackLayout {
  orientation: Orientation;
  width: number;
  height: number;
  metrics: Metrics;
  nodes: TrackNode[];
  connectors: TrackConnector[];
}

const nodeWidth = (n: GraphNode): number => (n.kind === "audience" ? AUDIENCE_W : n.kind === "plan" ? PLAN_W : 0);

/** Groups node ids by column, ordering each column by the barycentre of its parents. */
function orderColumns(nodes: readonly GraphNode[], edges: readonly GraphEdge[], cols: Map<string, number>, lampY: Map<string, number>, place: (col: number, ids: string[]) => void): string[][] {
  const count = Math.max(...cols.values()) + 1;
  const columns: string[][] = [];
  for (let c = 0; c < count; c++) {
    const ids = nodes.filter((n) => cols.get(n.id) === c).map((n) => n.id);
    const key = (id: string): number => {
      const ys = edges.filter((e) => e.to === id && (cols.get(e.from) ?? 0) < c && lampY.has(e.from)).map((e) => lampY.get(e.from)!);
      return ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : Number.POSITIVE_INFINITY;
    };
    const sorted = c === 0 ? ids : ids.map((id, i) => ({ id, i, k: key(id) })).sort((a, b) => a.k - b.k || a.i - b.i).map((s) => s.id);
    columns.push(sorted);
    place(c, sorted);
  }
  return columns;
}

function columnWidths(columns: string[][], graphNodes: Map<string, GraphNode>, channelMin: number[]): { widths: number[]; commitW: number } {
  const fixed = columns.map((ids) => Math.max(0, ...ids.map((id) => nodeWidth(graphNodes.get(id)!))));
  const hasCommit = columns.map((ids) => ids.some((id) => graphNodes.get(id)!.kind === "commitment"));
  const nCommit = hasCommit.filter(Boolean).length;
  const fixedSum = fixed.reduce((sum, w, i) => sum + (hasCommit[i] ? 0 : w), 0);
  const channelSum = channelMin.reduce((a, b) => a + b, 0);
  const free = PANEL_W - 2 * PAD_X - fixedSum - channelSum;
  const commitW = nCommit > 0 ? Math.max(COMMIT_W_MIN, Math.min(COMMIT_W_MAX, Math.floor(free / nCommit))) : 0;
  return { widths: fixed.map((w, i) => (hasCommit[i] ? Math.max(w, commitW) : w)), commitW };
}

/** Pure layout: State in, positioned nodes and railway connectors out. */
export function computeTrackLayout(state: State, options: LayoutOptions = {}): TrackLayout {
  const graph = buildGraph(state);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const cols = assignColumns(graph);
  const forward = graph.edges.filter((e) => (cols.get(e.to) ?? 0) > (cols.get(e.from) ?? 0));
  const edges = reduceEdges(forward);
  if (options.orientation === "portrait") return computePortraitLayout(graph.nodes, edges, cols, options.width ?? PORTRAIT_DEFAULT_W, options.trainRoom ?? true);

  // Vertical placement, column by column, so each column can order itself by its parents.
  const perColumn = new Map<number, number>();
  for (const c of cols.values()) perColumn.set(c, (perColumn.get(c) ?? 0) + 1);
  const m = Math.max(...perColumn.values()) > 4 ? COMPACT : LARGE;
  const lampY = new Map<string, number>();
  const boxTop = new Map<string, number>();
  const place = (_c: number, ids: string[]) => {
    const slot = Math.min((AREA_BOTTOM - AREA_TOP) / ids.length, MAX_SLOT);
    const start = AREA_TOP + ((AREA_BOTTOM - AREA_TOP) - ids.length * slot) / 2;
    ids.forEach((id, i) => {
      const top = start + i * slot + (slot - m.nodeH) / 2;
      boxTop.set(id, top);
      lampY.set(id, top + m.housingR);
    });
  };
  const columns = orderColumns(graph.nodes, edges, cols, lampY, place);

  // Channels between columns: width grows with the number of vertical track pieces in it.
  const channelCount = Math.max(0, columns.length - 1);
  const verticals = new Array<number>(channelCount).fill(0);
  for (const e of edges) {
    const s = cols.get(e.from)!;
    const t = cols.get(e.to)! - 1;
    verticals[s] = (verticals[s] ?? 0) + 1;
    if (t !== s) verticals[t] = (verticals[t] ?? 0) + 1;
  }
  const channelMin = verticals.map((n) => CHANNEL_BASE + LANE_PITCH * n);
  const { widths } = columnWidths(columns, byId, channelMin);
  const spare = PANEL_W - 2 * PAD_X - widths.reduce((a, b) => a + b, 0) - channelMin.reduce((a, b) => a + b, 0);
  const channelW = channelMin.map((w) => w + (channelCount > 0 ? Math.max(0, spare) / channelCount : 0));

  const colX: number[] = [];
  const chX: number[] = [];
  let cursor = PAD_X;
  columns.forEach((_ids, c) => {
    colX.push(cursor);
    cursor += widths[c]!;
    chX.push(cursor);
    cursor += channelW[c] ?? 0;
  });

  const nodes: TrackNode[] = [];
  columns.forEach((ids, c) => {
    ids.forEach((id, row) => {
      const g = byId.get(id)!;
      const x = colX[c]!;
      nodes.push({
        id, kind: g.kind, commitmentId: g.commitment?.id, col: c, row, order: nodes.length,
        x, y: boxTop.get(id)!, w: widths[c]!, h: m.nodeH, lampX: x + m.housingR, lampY: lampY.get(id)!,
        labelX: x, labelY: boxTop.get(id)! + m.housingR * 2 + m.labelGap, labelW: widths[c]! - 6,
      });
    });
  });
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const connectors = routeConnectors(edges, nodeById, nodes, chX, channelW, verticals, m.housingR);
  return { orientation: "landscape", width: PANEL_W, height: PANEL_H, metrics: m, nodes, connectors };
}

/** Rows a long run may take: just above and below every node, plus the panel's top and bottom. */
function laneCandidates(nodes: readonly TrackNode[]): number[] {
  const lanes = [LANE_TOP, LANE_BOTTOM];
  for (const n of nodes) lanes.push(n.y - LANE_CLEARANCE, n.y + n.h + LANE_CLEARANCE);
  return lanes.filter((y) => y >= LANE_TOP && y <= LANE_BOTTOM);
}

function routeConnectors(
  edges: readonly GraphEdge[], nodeById: Map<string, TrackNode>, nodes: readonly TrackNode[],
  chX: readonly number[], channelW: readonly number[], verticals: readonly number[], housingR: number,
): TrackConnector[] {
  const lanes = laneCandidates(nodes);
  const laneUse = new Map<number, number>();
  const nextLane = new Array<number>(verticals.length).fill(0);
  const laneX = (ch: number): number => {
    const k = nextLane[ch]!;
    nextLane[ch] = k + 1;
    const n = verticals[ch]!;
    return chX[ch]! + (channelW[ch]! - (n - 1) * LANE_PITCH) / 2 + k * LANE_PITCH;
  };
  const sorted = [...edges].sort((a, b) => nodeById.get(a.to)!.lampY - nodeById.get(b.to)!.lampY || nodeById.get(a.from)!.lampY - nodeById.get(b.from)!.lampY);

  return sorted.map((e) => {
    const from = nodeById.get(e.from)!;
    const to = nodeById.get(e.to)!;
    const start: Point = { x: from.lampX + housingR, y: from.lampY };
    const end: Point = { x: to.lampX - housingR, y: to.lampY };
    const srcCh = from.col;
    const tgtCh = to.col - 1;
    const pts: Point[] = [start];
    if (srcCh === tgtCh) {
      const x = laneX(srcCh);
      pts.push({ x, y: start.y }, { x, y: end.y });
    } else {
      const between: Box[] = nodes.filter((n) => n.col > from.col && n.col < to.col);
      const run = chooseRun(start.y, end.y, between, lanes);
      const used = laneUse.get(run.y) ?? 0;
      if (run.bypass) laneUse.set(run.y, used + 1);
      const runY = run.bypass ? run.y + Math.ceil(used / 2) * 6 * (used % 2 === 1 ? 1 : -1) : run.y;
      const xs = laneX(srcCh);
      const xt = laneX(tgtCh);
      pts.push({ x: xs, y: start.y }, { x: xs, y: runY }, { x: xt, y: runY }, { x: xt, y: end.y });
    }
    pts.push(end);
    const points = dedupe(pts);
    return { id: e.id, fromId: e.from, toId: e.to, resource: e.resource, points, path: chamferPath(points, CHAMFER) };
  });
}

// ---- portrait: the same graph, columns become rows, flowing top to bottom ----

export const PORTRAIT_DEFAULT_W = 358;
/** Phone sizes come from the design system's responsive scale (its 390px values). */
export const PHONE: Metrics = {
  housingR: 18, lampR: 13, nodeH: 0, labelGap: 14,
  nameSize: phoneType.label, nameLine: 20, offerSize: phoneType.body, offerLine: 22, quoteSize: phoneType.label, quoteLine: 19, quoteGap: 4, quoteLines: 2,
};
/** Room above the first signal for the train waiting at it. */
export const TRAIN_ROOM = 104;
const P_PAD_TOP = 8;
const P_PAD_BOTTOM = 8;
const P_ROW_GAP = 22;
const P_LANE_X0 = 6;
const P_LANE_PITCH = 10;
const P_LANE_CLEAR = 16;
const P_JOG = 16;
const P_CHAMFER = 8;

const heightOf = (kind: NodeKind, m: Metrics): number => {
  if (kind === "commitment") return m.nameLine + m.offerLine + m.quoteGap + m.quoteLines * m.quoteLine;
  if (kind === "audience") return Math.max(m.housingR * 2, m.nameLine + m.offerLine);
  return m.housingR * 2;
};

/** Assigns each bypass edge a lane (an x), sharing a lane between spans that do not overlap. */
function packLanes(spans: readonly { id: string; top: number; bottom: number }[]): Map<string, number> {
  const ends: number[] = [];
  const lane = new Map<string, number>();
  for (const s of [...spans].sort((a, b) => a.top - b.top || a.bottom - b.bottom)) {
    let k = ends.findIndex((end) => end < s.top);
    if (k < 0) k = ends.length;
    ends[k] = s.bottom;
    lane.set(s.id, k);
  }
  return lane;
}

/**
 * Portrait: the audience at the top, PLAN at the bottom, one signal per row in the order the
 * landscape layout would read them (by depth, then by parents). The lamps share one vertical
 * line with the text beside them. A connector between neighbouring rows is a straight piece of
 * track; one that skips rows runs down a lane to the left of the lamps and comes back in.
 */
function computePortraitLayout(
  nodes: readonly GraphNode[], edges: readonly GraphEdge[], cols: Map<string, number>, width: number, trainRoom: boolean,
): TrackLayout {
  const m = PHONE;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rowOf = new Map<string, number>();
  const ordered: string[] = [];
  orderColumns(nodes, edges, cols, rowOf, (_c, ids) => {
    for (const id of ids) {
      rowOf.set(id, ordered.length);
      ordered.push(id);
    }
  });

  const adjacent = (e: GraphEdge) => rowOf.get(e.to)! - rowOf.get(e.from)! === 1;
  const bypass = edges.filter((e) => !adjacent(e));
  const tops = new Map<string, number>();
  let cursor = edges.length > 0 && trainRoom ? TRAIN_ROOM : P_PAD_TOP;
  for (const id of ordered) {
    tops.set(id, cursor);
    cursor += heightOf(byId.get(id)!.kind, m) + P_ROW_GAP;
  }
  const height = cursor - P_ROW_GAP + P_PAD_BOTTOM;

  const spans = bypass.map((e) => ({
    id: e.id,
    top: tops.get(e.from)! + m.housingR * 2 - 2,
    bottom: tops.get(e.to)! + 2,
  }));
  const lanes = packLanes(spans);
  const laneCount = lanes.size === 0 ? 0 : Math.max(...lanes.values()) + 1;
  const gutter = laneCount === 0 ? 4 : P_LANE_X0 + (laneCount - 1) * P_LANE_PITCH + P_LANE_CLEAR;
  const lampX = gutter + m.housingR;
  const labelX = lampX + m.housingR + m.labelGap;

  const placed: TrackNode[] = ordered.map((id, order) => {
    const g = byId.get(id)!;
    const y = tops.get(id)!;
    const lampY = y + m.housingR;
    return {
      id, kind: g.kind, commitmentId: g.commitment?.id, col: cols.get(id) ?? 0, row: order, order,
      x: gutter, y, w: width - gutter, h: heightOf(g.kind, m), lampX, lampY,
      labelX, labelW: width - labelX - 2,
      labelY: g.kind === "plan" ? lampY - m.offerLine / 2 : lampY - m.nameLine / 2,
    };
  });
  const nodeById = new Map(placed.map((n) => [n.id, n]));

  const connectors: TrackConnector[] = edges.map((e) => {
    const from = nodeById.get(e.from)!;
    const to = nodeById.get(e.to)!;
    const start: Point = { x: lampX, y: from.lampY + m.housingR };
    const end: Point = { x: lampX, y: to.lampY - m.housingR };
    const pts: Point[] = [start];
    if (!adjacent(e)) {
      const x = P_LANE_X0 + lanes.get(e.id)! * P_LANE_PITCH;
      pts.push({ x: lampX, y: start.y + P_JOG }, { x, y: start.y + P_JOG }, { x, y: end.y - P_JOG }, { x: lampX, y: end.y - P_JOG });
    }
    pts.push(end);
    const points = dedupe(pts);
    return { id: e.id, fromId: e.from, toId: e.to, resource: e.resource, points, path: chamferPath(points, P_CHAMFER) };
  });
  return { orientation: "portrait", width, height, metrics: m, nodes: placed, connectors };
}

export { AUDIENCE_ID, PLAN_ID };
