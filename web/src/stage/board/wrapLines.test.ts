import { describe, expect, it } from "vitest";
import { wrapLines } from "./wrapLines";

describe("wrapLines", () => {
  it("keeps short text on one uppercase row", () => {
    expect(wrapLines("doors and pizza", 24, 3)).toEqual(["DOORS AND PIZZA"]);
  });
  it("wraps at word boundaries", () => {
    expect(wrapLines("18:30 Doors, pizza and laptops handed out", 24, 3)).toEqual([
      "18:30 DOORS, PIZZA AND",
      "LAPTOPS HANDED OUT",
    ]);
  });
  it("never exceeds the width", () => {
    const lines = wrapLines("18:45 How a Grok agent actually works, in ten minutes", 24, 3);
    expect(lines.every((l) => l.length <= 24)).toBe(true);
    expect(lines.join(" ")).toBe("18:45 HOW A GROK AGENT ACTUALLY WORKS, IN TEN MINUTES");
  });
  it("hard-splits a word longer than the row", () => {
    expect(wrapLines("abcdefghij", 4, 5)).toEqual(["ABCD", "EFGH", "IJ"]);
  });
  it("cuts text that does not fit the line budget", () => {
    expect(wrapLines("one two three four five six", 7, 2)).toEqual(["ONE TWO", "THREE"]);
  });
  it("returns no rows for empty text", () => {
    expect(wrapLines("   ", 10, 2)).toEqual([]);
  });
});
