import { describe, expect, it } from "vitest";
import type { Commitment, State } from "@deadlock/shared/types";
import { blocked, booked, noPlan } from "../../fixtures";
import { buildGraph, assignColumns, reduceEdges } from "./graph";
import { chamferPath } from "./route";
import { computeTrackLayout, PANEL_H, PANEL_W, type TrackLayout, type TrackNode } from "./layout";

const node = (l: TrackLayout, id: string): TrackNode => l.nodes.find((n) => n.id === id)!;
const nodeOf = (l: TrackLayout, offers: string, s: State): TrackNode =>
  node(l, s.commitments.find((c) => c.offers === offers)!.id);

function commitment(id: string, offers: string, requires: string[]): Commitment {
  return {
    id, personId: "p1", offers, quote: `quote ${id}`, status: "waiting",
    requires: requires.map((r) => (r === "attendees" ? { resource: r, minCount: 15 } : { resource: r })),
  };
}

function stateWith(commitments: Commitment[], required: string[] = ["attendees"]): State {
  return { ...blocked, commitments, plan: { ...blocked.plan!, requiredForPlan: required } };
}

function overlap(a: TrackNode, b: TrackNode): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function expectClean(l: TrackLayout) {
  for (const n of l.nodes) {
    expect(n.x).toBeGreaterThanOrEqual(0);
    expect(n.y).toBeGreaterThanOrEqual(0);
    expect(n.x + n.w).toBeLessThanOrEqual(PANEL_W);
    expect(n.y + n.h).toBeLessThanOrEqual(PANEL_H);
  }
  for (let i = 0; i < l.nodes.length; i++) {
    for (let j = i + 1; j < l.nodes.length; j++) {
      expect(overlap(l.nodes[i]!, l.nodes[j]!), `${l.nodes[i]!.id} vs ${l.nodes[j]!.id}`).toBe(false);
    }
  }
}

describe("buildGraph and assignColumns", () => {
  it("links offerers to requirers and required-for-plan resources to PLAN", () => {
    const g = buildGraph(blocked);
    const pairs = g.edges.map((e) => `${e.from}>${e.to}`);
    expect(pairs).toContain("audience>c1");
    expect(pairs).toContain("c1>c2");
    expect(pairs).toContain("c1>c3");
    expect(pairs).toContain("c2>c4");
    for (const from of ["audience", "c1", "c2", "c3"]) expect(pairs).toContain(`${from}>plan`);
    expect(pairs).not.toContain("c4>plan");
  });

  it("puts nodes at their longest-path depth and PLAN in the last column", () => {
    const cols = assignColumns(buildGraph(blocked));
    expect(cols.get("audience")).toBe(0);
    expect(cols.get("c1")).toBe(1);
    expect(cols.get("c2")).toBe(2);
    expect(cols.get("c3")).toBe(2);
    expect(cols.get("c4")).toBe(3);
    expect(cols.get("plan")).toBe(4);
  });

  it("survives a literal deadlock cycle", () => {
    const s = stateWith([commitment("a", "x", ["y"]), commitment("b", "y", ["x"])], ["x", "y"]);
    const cols = assignColumns(buildGraph(s));
    expect(cols.get("plan")).toBeGreaterThan(cols.get("a")!);
    expect(() => computeTrackLayout(s)).not.toThrow();
  });
});

describe("reduceEdges", () => {
  it("drops an edge whose target is reachable by a longer path", () => {
    const pairs = reduceEdges(buildGraph(blocked).edges).map((e) => `${e.from}>${e.to}`);
    expect(pairs).not.toContain("audience>plan");
    expect(pairs).not.toContain("c1>plan");
    expect(pairs).toContain("c2>plan");
    expect(pairs).toContain("c3>plan");
  });
  it("keeps a lone required-for-plan edge", () => {
    const s = stateWith([commitment("a", "x", ["attendees"])], ["x"]);
    expect(reduceEdges(buildGraph(s).edges).map((e) => e.id)).toContain("a>plan:x");
  });
});

describe("computeTrackLayout", () => {
  it("lays out the blocked fixture left to right by depth without overlap", () => {
    const l = computeTrackLayout(blocked);
    expect(l.nodes).toHaveLength(6);
    expect(node(l, "audience").x).toBeLessThan(nodeOf(l, "venue", blocked).x);
    expect(nodeOf(l, "venue", blocked).x).toBeLessThan(nodeOf(l, "speaker", blocked).x);
    expect(nodeOf(l, "speaker", blocked).x).toBeLessThan(nodeOf(l, "food", blocked).x);
    expect(nodeOf(l, "food", blocked).x).toBeLessThan(node(l, "plan").x);
    expect(nodeOf(l, "speaker", blocked).x).toBe(nodeOf(l, "laptops", blocked).x);
    expectClean(l);
  });

  it("is deterministic", () => {
    expect(computeTrackLayout(booked)).toEqual(computeTrackLayout(booked));
  });

  it("still shows the audience and an unconnected PLAN with no plan", () => {
    const l = computeTrackLayout(noPlan);
    expect(l.nodes.map((n) => n.kind).sort()).toEqual(["audience", "plan"]);
    expect(l.connectors).toEqual([]);
    expectClean(l);
  });

  it("orders rows by the barycentre of parents to limit crossings", () => {
    const s = stateWith([
      commitment("a", "ra", ["attendees"]),
      commitment("b", "rb", ["attendees"]),
      commitment("c", "rc", ["rb"]),
      commitment("d", "rd", ["ra"]),
    ]);
    const l = computeTrackLayout(s);
    const yOf = (id: string) => node(l, id).y;
    // a is above b, so d (child of a) must sit above c (child of b).
    expect(yOf("a") < yOf("b")).toBe(true);
    expect(yOf("d") < yOf("c")).toBe(true);
  });

  it.each([3, 4, 5, 6])("fits %i commitments in one dependent column without overlap", (n) => {
    const commitments = Array.from({ length: n }, (_, i) => commitment(`c${i}`, `r${i}`, ["attendees"]));
    const l = computeTrackLayout(stateWith(commitments, commitments.map((c) => c.offers)));
    expect(l.nodes).toHaveLength(n + 2);
    expectClean(l);
  });

  it("fits six commitments spread over three dependent columns", () => {
    const commitments = [
      commitment("a", "ra", ["attendees"]),
      commitment("b", "rb", ["attendees"]),
      commitment("c", "rc", ["ra"]),
      commitment("d", "rd", ["rb"]),
      commitment("e", "re", ["rc"]),
      commitment("f", "rf", ["rd"]),
    ];
    expectClean(computeTrackLayout(stateWith(commitments, ["re", "rf"])));
  });

  it("uses the column height and the big lamp set for a simple graph, compact for six in a column", () => {
    const l = computeTrackLayout(blocked);
    const top = Math.min(...l.nodes.map((n) => n.y));
    const bottom = Math.max(...l.nodes.map((n) => n.y + n.h));
    expect(bottom - top).toBeGreaterThan(PANEL_H * 0.5);
    expect(l.metrics.housingR).toBeGreaterThanOrEqual(30);
    const six = Array.from({ length: 6 }, (_, i) => commitment(`c${i}`, `r${i}`, ["attendees"]));
    expect(computeTrackLayout(stateWith(six, six.map((c) => c.offers))).metrics.housingR).toBeLessThan(30);
  });

  it("gives every lamp a connector end point on its lamp edge", () => {
    const l = computeTrackLayout(blocked);
    for (const c of l.connectors) {
      const from = node(l, c.fromId);
      const to = node(l, c.toId);
      expect(c.points[0]).toEqual({ x: from.lampX + l.metrics.housingR, y: from.lampY });
      expect(c.points[c.points.length - 1]).toEqual({ x: to.lampX - l.metrics.housingR, y: to.lampY });
      expect(c.path.startsWith("M")).toBe(true);
    }
    expect(l.connectors.map((c) => `${c.fromId}>${c.toId}`).sort()).toEqual(["audience>c1", "c1>c2", "c1>c3", "c2>c4", "c2>plan", "c3>plan"]);
  });

  it("keeps connectors orthogonal and clear of other nodes", () => {
    const l = computeTrackLayout(blocked);
    for (const c of l.connectors) {
      for (let i = 1; i < c.points.length; i++) {
        const a = c.points[i - 1]!;
        const b = c.points[i]!;
        expect(a.x === b.x || a.y === b.y, `${c.id} segment ${i}`).toBe(true);
        for (const n of l.nodes) {
          if (n.id === c.fromId || n.id === c.toId) continue;
          const hits = Math.min(a.x, b.x) < n.x + n.w && Math.max(a.x, b.x) > n.x && Math.min(a.y, b.y) < n.y + n.h && Math.max(a.y, b.y) > n.y;
          expect(hits, `${c.id} crosses ${n.id}`).toBe(false);
        }
      }
    }
  });
});

describe("chamferPath", () => {
  it("cuts corners at 45 degrees", () => {
    const d = chamferPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], 10);
    expect(d).toBe("M 0 0 L 90 0 L 100 10 L 100 100");
  });
  it("limits the cut to half of a short segment", () => {
    const d = chamferPath([{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 100 }], 10);
    expect(d).toBe("M 0 0 L 4 0 L 8 4 L 8 100");
  });
  it("handles a straight line", () => {
    expect(chamferPath([{ x: 0, y: 5 }, { x: 50, y: 5 }], 10)).toBe("M 0 5 L 50 5");
  });
});
