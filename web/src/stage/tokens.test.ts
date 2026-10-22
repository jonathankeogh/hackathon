import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { colors, hexAlpha, withAlpha } from "./tokens";

describe("tokens", () => {
  it("matches the contract palette", () => {
    expect(colors).toEqual({
      bg: "#0E0E0C",
      text: "#EDEAE2",
      divider: "#2A2925",
      red: "#FF3B30",
      amber: "#FFB000",
      green: "#3DDC84",
    });
  });

  it("derives opacity variants", () => {
    expect(withAlpha("text", 0.5)).toBe("rgba(237, 234, 226, 0.5)");
    expect(hexAlpha("#FF3B30", 0.15)).toBe("rgba(255, 59, 48, 0.15)");
  });

  it("keeps stage.css variables in sync with tokens", () => {
    const css = readFileSync(resolve(__dirname, "stage.css"), "utf8").toLowerCase();
    for (const [name, hex] of Object.entries(colors)) {
      expect(css).toContain(`--dl-${name}: ${hex.toLowerCase()};`);
    }
  });
});
