import { describe, expect, it } from "vitest";
import { GLYPHS, buildSequence, normalizeText, planFlips } from "./splitFlapSequence";

const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

describe("normalizeText", () => {
  it("uppercases and pads to length", () => {
    expect(normalizeText("go", 5)).toBe("GO   ");
  });
  it("truncates to length", () => {
    expect(normalizeText("abcdef", 3)).toBe("ABC");
  });
  it("leaves text unpadded without a length", () => {
    expect(normalizeText("ab")).toBe("AB");
  });
});

describe("buildSequence", () => {
  it("ends on the target glyph with `flips` random glyphs before it", () => {
    const out = buildSequence("A", "Z", 4, seq([0, 0.5, 0.99, 0.25]));
    expect(out).toHaveLength(5);
    expect(out[4]).toBe("Z");
    expect(out[0]).toBe(GLYPHS[1]);
    expect(out[3]).not.toBe("Z");
  });
  it("never repeats the same glyph twice in a row", () => {
    const out = buildSequence("A", "B", 8, () => 0);
    for (let i = 1; i < out.length; i += 1) expect(out[i]).not.toBe(out[i - 1]);
  });
  it("is deterministic for a given random function", () => {
    const a = buildSequence("A", "B", 5, seq([0.1, 0.9, 0.4]));
    const b = buildSequence("A", "B", 5, seq([0.1, 0.9, 0.4]));
    expect(a).toEqual(b);
  });
});

describe("planFlips", () => {
  it("leaves unchanged characters out", () => {
    const plan = planFlips("ABC", "ABD", 25, 3, () => 0.3);
    expect(plan).toHaveLength(1);
    expect(plan[0]?.index).toBe(2);
  });
  it("staggers changed characters left to right", () => {
    const plan = planFlips("AAA", "BBB", 30, 2, () => 0.3);
    expect(plan.map((p) => p.delayMs)).toEqual([0, 30, 60]);
  });
  it("staggers by position even when earlier chars are unchanged", () => {
    const plan = planFlips("AAA", "ABB", 30, 2, () => 0.3);
    expect(plan.map((p) => [p.index, p.delayMs])).toEqual([[1, 30], [2, 60]]);
  });
  it("treats missing previous characters as spaces", () => {
    const plan = planFlips("", "AB", 10, 1, () => 0.3);
    expect(plan).toHaveLength(2);
  });
});
