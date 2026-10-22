import { describe, expect, it } from "vitest";
import { fitTitle, TITLE_CELLS } from "./fitTitle";

describe("fitTitle", () => {
  it("uppercases and keeps short titles whole", () => {
    expect(fitTitle("Hands-on Grok agents workshop")).toBe("HANDS-ON GROK AGENTS WORKSHOP");
  });
  it("collapses whitespace", () => {
    expect(fitTitle("  Grok   night ")).toBe("GROK NIGHT");
  });
  it("cuts at a word boundary when too long", () => {
    const out = fitTitle("An extremely long community meetup about agents", 30);
    expect(out).toBe("AN EXTREMELY LONG COMMUNITY");
    expect(out.length).toBeLessThanOrEqual(TITLE_CELLS);
  });
  it("hard cuts a single long word", () => {
    expect(fitTitle("Supercalifragilisticexpialidocious!", 10)).toBe("SUPERCALIF");
  });
  it("keeps a title that is exactly the limit", () => {
    expect(fitTitle("ABCDE FGHIJ", 11)).toBe("ABCDE FGHIJ");
  });
});
