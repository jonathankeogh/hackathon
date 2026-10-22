import { describe, expect, it } from "vitest";
import { NODE_IDS } from "./content";
import { chamferPath, trackLayout } from "./trackLayout";

describe("chamferPath", () => {
  it("is a straight line at the same height", () => {
    expect(chamferPath({ x: 0, y: 10 }, { x: 100, y: 10 })).toBe("M 0 10 L 100 10");
  });

  it("runs level, turns 45 degrees, and runs level again", () => {
    const d = chamferPath({ x: 0, y: 0 }, { x: 100, y: 40 });
    expect(d).toBe("M 0 0 L 30 0 L 70 40 L 70 40 L 100 40");
  });

  it("goes up as well as down, and never takes a diagonal longer than the run", () => {
    expect(chamferPath({ x: 0, y: 40 }, { x: 100, y: 0 })).toBe("M 0 40 L 30 40 L 70 0 L 70 0 L 100 0");
    const tight = chamferPath({ x: 0, y: 0 }, { x: 10, y: 100 });
    expect(tight.startsWith("M 0 0 L 0 0")).toBe(true);
  });
});

describe("trackLayout", () => {
  it("places every signal inside the panel, in left to right order", () => {
    for (const [w, h] of [[1000, 520], [358, 340]] as const) {
      const l = trackLayout(w, h);
      for (const id of NODE_IDS) {
        const n = l.nodes[id];
        expect(n.x - l.labelW / 2).toBeGreaterThanOrEqual(-1);
        expect(n.x + l.labelW / 2).toBeLessThanOrEqual(w + 1);
        expect(n.y).toBeGreaterThan(0);
        expect(n.y).toBeLessThan(h);
      }
      expect(l.nodes.attendees.x).toBeLessThan(l.nodes.venue.x);
      expect(l.nodes.venue.x).toBeLessThan(l.nodes.speaker.x);
      expect(l.nodes.speaker.x).toBeLessThan(l.nodes.plan.x);
      expect(l.nodes.speaker.y).toBeLessThan(l.nodes.venue.y);
      expect(l.nodes.laptops.y).toBeGreaterThan(l.nodes.venue.y);
    }
  });

  it("goes compact on phones and short panels, with smaller lamps", () => {
    expect(trackLayout(1000, 520).compact).toBe(false);
    expect(trackLayout(358, 340).compact).toBe(true);
    expect(trackLayout(1000, 380).compact).toBe(true);
    expect(trackLayout(358, 340).lamp).toBeLessThan(trackLayout(1000, 520).lamp);
  });

  it("has a path for each connector", () => {
    const l = trackLayout(1000, 520);
    expect(l.connectors).toHaveLength(5);
    expect(l.connectors.every((c) => c.d.startsWith("M "))).toBe(true);
  });
});
