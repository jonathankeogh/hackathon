import { describe, expect, it } from "vitest";
import { STRIP_PLANS } from "./content";
import { stripRow, wavesBooked } from "./stripLogic";

describe("stripRow", () => {
  it("gives different plans on different rows and cycles through all of them", () => {
    expect(stripRow(0, 0).plan).not.toBe(stripRow(0, 1).plan);
    const seen = new Set(Array.from({ length: STRIP_PLANS.length }, (_, t) => stripRow(t, 0).plan.name));
    expect(seen.size).toBe(STRIP_PLANS.length);
  });

  it("names nobody once a plan is booked, and fits the flap rows", () => {
    for (let t = 0; t < 12; t += 1) {
      const row = stripRow(t, 0);
      if (row.status === "booked") expect(row.waitingOn).toBe("NOBODY");
      expect(row.plan.name.length).toBeLessThanOrEqual(12);
      expect(row.waitingOn.length).toBeLessThanOrEqual(10);
    }
  });

  it("copes with a negative tick", () => {
    expect(() => stripRow(-5, 2)).not.toThrow();
  });
});

describe("wavesBooked", () => {
  it("books `width` neighbouring items and moves along with the tick", () => {
    const at = (t: number) => Array.from({ length: 6 }, (_, i) => wavesBooked(i, t, 6)).map(Number).join("");
    expect(at(0)).toBe("100001");
    expect(at(1)).toBe("110000");
    expect(at(3)).toBe("001100");
    expect(at(6)).toBe(at(0));
  });
});
