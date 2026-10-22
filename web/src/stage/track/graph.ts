import type { Commitment, State } from "@deadlock/shared/types";

export const AUDIENCE_ID = "audience";
export const PLAN_ID = "plan";

export type NodeKind = "audience" | "commitment" | "plan";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  commitment?: Commitment;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  resource: string;
}

export interface TrackGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Which node offers a resource: attendees come from the audience, the rest from commitments. */
function offerers(state: State, resource: string): string[] {
  if (resource === "attendees") return [AUDIENCE_ID];
  return state.commitments.filter((c) => c.offers === resource).map((c) => c.id);
}

/**
 * Nodes: the audience, one per commitment, and PLAN. Edges run from the node offering a
 * resource to the node requiring it; required-for-plan resources connect to PLAN.
 */
export function buildGraph(state: State): TrackGraph {
  const nodes: GraphNode[] = [
    { id: AUDIENCE_ID, kind: "audience" },
    ...state.commitments.map((c): GraphNode => ({ id: c.id, kind: "commitment", commitment: c })),
    { id: PLAN_ID, kind: "plan" },
  ];
  const edges = new Map<string, GraphEdge>();
  const add = (from: string, to: string, resource: string) => {
    const id = `${from}>${to}:${resource}`;
    if (from !== to && !edges.has(id)) edges.set(id, { id, from, to, resource });
  };
  for (const c of state.commitments) {
    for (const cond of c.requires) for (const from of offerers(state, cond.resource)) add(from, c.id, cond.resource);
  }
  for (const resource of state.plan?.requiredForPlan ?? []) {
    for (const from of offerers(state, resource)) add(from, PLAN_ID, resource);
  }
  return { nodes, edges: [...edges.values()] };
}

/** Back edges (cycles) found by depth-first search, so a literal deadlock cannot loop forever. */
function findBackEdges(graph: TrackGraph): Set<string> {
  const out = new Map<string, GraphEdge[]>();
  for (const e of graph.edges) out.set(e.from, [...(out.get(e.from) ?? []), e]);
  const state = new Map<string, "open" | "done">();
  const back = new Set<string>();
  const visit = (id: string) => {
    state.set(id, "open");
    for (const e of out.get(id) ?? []) {
      const s = state.get(e.to);
      if (s === "open") back.add(e.id);
      else if (!s) visit(e.to);
    }
    state.set(id, "done");
  };
  for (const n of graph.nodes) if (!state.has(n.id)) visit(n.id);
  return back;
}

/** Column per node: depth = longest path from a source; PLAN always sits in the last column. */
export function assignColumns(graph: TrackGraph): Map<string, number> {
  const back = findBackEdges(graph);
  const edges = graph.edges.filter((e) => !back.has(e.id));
  const depth = new Map<string, number>();
  const resolve = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    const parents = edges.filter((e) => e.to === id).map((e) => resolve(e.from));
    const d = parents.length > 0 ? Math.max(...parents) + 1 : 0;
    depth.set(id, d);
    return d;
  };
  for (const n of graph.nodes) resolve(n.id);
  const last = Math.max(0, ...graph.nodes.filter((n) => n.id !== PLAN_ID).map((n) => depth.get(n.id) ?? 0)) + 1;
  depth.set(PLAN_ID, last);
  return depth;
}

/**
 * Transitive reduction for drawing: an edge is dropped when its target is already reachable
 * from its source by a longer path, so "venue to PLAN" is not drawn when the venue reaches
 * PLAN through the speaker. The full edge set stays available from buildGraph.
 */
export function reduceEdges(edges: readonly GraphEdge[]): GraphEdge[] {
  const reachable = (from: string, target: string, skip: GraphEdge, seen: Set<string>): boolean => {
    if (from === target) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return edges.some((e) => e !== skip && e.from === from && reachable(e.to, target, skip, seen));
  };
  return edges.filter((e) => !edges.some((first) => first !== e && first.from === e.from && reachable(first.to, e.to, e, new Set([e.from]))));
}
