import { describe, expect, it } from "vitest";
import { entranceIndexes } from "./entrances";

describe("entranceIndexes", () => {
  it("is empty when every id was already seen", () => {
    expect(entranceIndexes(new Set(["a", "b"]), ["a", "b"]).size).toBe(0);
  });

  it("indexes the new ids in order, skipping the seen ones", () => {
    const fresh = entranceIndexes(new Set(["a"]), ["a", "b", "c"]);
    expect([...fresh]).toEqual([["b", 0], ["c", 1]]);
  });

  it("counts a repeated id once", () => {
    expect([...entranceIndexes(new Set(), ["x", "x", "y"])]).toEqual([["x", 0], ["y", 1]]);
  });

  it("treats a removed and re-added id as new once the seen set has dropped it", () => {
    expect(entranceIndexes(new Set(["a"]), ["a", "b"]).has("b")).toBe(true);
    expect(entranceIndexes(new Set(["a"]), ["a"]).has("b")).toBe(false);
  });
});
