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

describe("computeTrackLayout, portrait", () => {
  const W = 390 - 32;
  const portrait = (s: State, width = W) => computeTrackLayout(s, { orientation: "portrait", width });

  function expectPortraitClean(l: TrackLayout, width: number) {
    for (const n of l.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.labelX + n.labelW).toBeLessThanOrEqual(width);
      expect(n.y + n.h).toBeLessThanOrEqual(l.height);
    }
    for (let i = 0; i < l.nodes.length; i++) {
      for (let j = i + 1; j < l.nodes.length; j++) {
        const a = l.nodes[i]!;
        const b = l.nodes[j]!;
        expect(a.y < b.y + b.h && b.y < a.y + a.h, `${a.id} vs ${b.id}`).toBe(false);
      }
    }
  }

  it("flows top to bottom: audience first, PLAN last, every connector runs downwards", () => {
    const l = portrait(blocked);
    expect(l.orientation).toBe("portrait");
    expect(l.nodes).toHaveLength(6);
    const ys = [...l.nodes].sort((a, b) => a.y - b.y).map((n) => n.id);
    expect(ys[0]).toBe("audience");
    expect(ys[ys.length - 1]).toBe("plan");
    for (const c of l.connectors) expect(node(l, c.fromId).y).toBeLessThan(node(l, c.toId).y);
    expect(l.connectors.map((c) => `${c.fromId}>${c.toId}`).sort()).toEqual(["audience>c1", "c1>c2", "c1>c3", "c2>c4", "c2>plan", "c3>plan"]);
  });

  it("puts a dependency below the signal it depends on", () => {
    const l = portrait(blocked);
    expect(nodeOf(l, "venue", blocked).y).toBeLessThan(nodeOf(l, "speaker", blocked).y);
    expect(nodeOf(l, "speaker", blocked).y).toBeLessThan(nodeOf(l, "food", blocked).y);
  });

  it.each([3, 4, 5, 6])("fits %i commitments at 390 wide with no overlap and text inside the width", (n) => {
    const commitments = Array.from({ length: n }, (_, i) => commitment(`c${i}`, `r${i}`, ["attendees"]));
    const l = portrait(stateWith(commitments, commitments.map((c) => c.offers)));
    expect(l.nodes).toHaveLength(n + 2);
    expectPortraitClean(l, W);
  });

  it("fits six commitments spread over three dependent levels at 360 wide", () => {
    const commitments = [
      commitment("a", "ra", ["attendees"]),
      commitment("b", "rb", ["attendees"]),
      commitment("c", "rc", ["ra"]),
      commitment("d", "rd", ["rb"]),
      commitment("e", "re", ["rc"]),
      commitment("f", "rf", ["rd"]),
    ];
    const l = portrait(stateWith(commitments, ["re", "rf"]), 360 - 32);
    expectPortraitClean(l, 360 - 32);
  });

  it("keeps every lamp on one vertical line and connectors orthogonal, off the lamps they pass", () => {
    const l = portrait(blocked);
    expect(new Set(l.nodes.map((n) => n.lampX)).size).toBe(1);
    for (const c of l.connectors) {
      for (let i = 1; i < c.points.length; i++) {
        const a = c.points[i - 1]!;
        const b = c.points[i]!;
        expect(a.x === b.x || a.y === b.y, `${c.id} segment ${i}`).toBe(true);
      }
      const x = l.nodes[0]!.lampX;
      const r = l.metrics.housingR;
      for (const n of l.nodes) {
        if (n.id === c.fromId || n.id === c.toId) continue;
        for (let i = 1; i < c.points.length; i++) {
          const a = c.points[i - 1]!;
          const b = c.points[i]!;
          const crossesLamp = a.x === b.x && Math.abs(a.x - x) < r && Math.min(a.y, b.y) < n.lampY + r && Math.max(a.y, b.y) > n.lampY - r;
          expect(crossesLamp, `${c.id} runs through ${n.id}`).toBe(false);
        }
      }
    }
  });

  it("starts each connector at the bottom of its source lamp and ends at the top of its target", () => {
    const l = portrait(blocked);
    for (const c of l.connectors) {
      expect(c.points[0]).toEqual({ x: node(l, c.fromId).lampX, y: node(l, c.fromId).lampY + l.metrics.housingR });
      expect(c.points[c.points.length - 1]).toEqual({ x: node(l, c.toId).lampX, y: node(l, c.toId).lampY - l.metrics.housingR });
    }
  });

  it("keeps quotes to two lines and sizes from the phone scale", () => {
    const l = portrait(blocked);
    expect(l.metrics.quoteLines).toBe(2);
    expect(l.metrics.nameSize).toBe(14);
    expect(l.metrics.offerSize).toBe(16);
  });

  it("reserves room for the waiting train only when asked, and only when there is a line", () => {
    const withRoom = portrait(blocked);
    const without = computeTrackLayout(blocked, { orientation: "portrait", width: W, trainRoom: false });
    expect(node(withRoom, "audience").y).toBeGreaterThan(node(without, "audience").y + 60);
    expect(portrait(noPlan).nodes[0]!.y).toBeLessThan(20);
  });

  it("is deterministic and leaves the landscape default untouched", () => {
    expect(portrait(booked)).toEqual(portrait(booked));
    expect(computeTrackLayout(blocked).orientation).toBe("landscape");
    expect(computeTrackLayout(blocked)).toEqual(computeTrackLayout(blocked, { orientation: "landscape" }));
  });
});
