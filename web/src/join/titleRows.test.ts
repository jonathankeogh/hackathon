import { describe, expect, it } from "vitest";
import { titleRows } from "./titleRows";

describe("titleRows", () => {
  it("wraps on word boundaries", () => {
    expect(titleRows("Hands-on Grok agents workshop")).toEqual(["Hands-on Grok", "agents workshop"]);
  });
  it("keeps a short title on one row", () => {
    expect(titleRows("Pizza night")).toEqual(["Pizza night"]);
  });
  it("cuts a word longer than a row and drops rows past the limit", () => {
    expect(titleRows("Supercalifragilisticexpialidocious", 10)).toEqual(["Supercalif"]);
    expect(titleRows("a bb ccc dddd eeeee ffffff", 4, 2)).toEqual(["a bb", "ccc"]);
  });
  it("returns nothing for blank titles", () => {
    expect(titleRows("   ")).toEqual([]);
  });
});
