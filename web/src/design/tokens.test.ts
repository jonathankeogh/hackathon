import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as stage from "../stage/tokens";
import { alphas, bigScale, bigStyle, borders, colors, fonts, layout, motionTokens, radii, settleAfter, SPACE, textStyle, tracking, typeScale, withAlpha, type TextRole } from "./tokens";

const css = readFileSync(resolve(__dirname, "design.css"), "utf8").toLowerCase();

/** Evaluate `clamp(Apx, Bpx + Cvw, Dpx)` at a viewport width. */
function clampAt(value: string, width: number): number {
  const m = /^clamp\((\d+(?:\.\d+)?)px, (\d+(?:\.\d+)?)px \+ (\d+(?:\.\d+)?)vw, (\d+(?:\.\d+)?)px\)$/.exec(value);
  if (!m) throw new Error(`not a clamp(): ${value}`);
  const [min, base, slope, max] = m.slice(1).map(Number);
  return Math.min(Math.max(min, base + (slope * width) / 100), max);
}

describe("design tokens", () => {
  it("keeps the contract palette", () => {
    expect(colors).toEqual({ bg: "#0E0E0C", text: "#EDEAE2", divider: "#2A2925", red: "#FF3B30", amber: "#FFB000", green: "#3DDC84" });
    expect(fonts.mono).toContain("IBM Plex Mono");
    expect(fonts.sans).toContain("IBM Plex Sans");
  });

  it("never lets readable opacity fall below 60%", () => {
    expect(alphas.read).toBeGreaterThanOrEqual(0.6);
    expect(withAlpha("text", alphas.read)).toBe("rgba(237, 234, 226, 0.6)");
  });

  it("has a fluid type scale that lands on the documented px at 390 and 1440", () => {
    for (const role of Object.keys(typeScale) as TextRole[]) {
      const { size, px } = typeScale[role];
      expect(Math.round(clampAt(size, 390))).toBe(px.phone);
      expect(Math.round(clampAt(size, 1440))).toBe(px.desktop);
      expect(px.desktop).toBeGreaterThanOrEqual(px.phone);
    }
  });

  it("orders the scale and keeps text readable", () => {
    const { display, title, body, label, small } = typeScale;
    expect(display.px.phone).toBeGreaterThan(title.px.phone);
    expect(title.px.phone).toBeGreaterThan(body.px.phone);
    expect(body.px.phone).toBeGreaterThanOrEqual(label.px.phone);
    expect(label.px.phone).toBeGreaterThan(small.px.phone);
    expect(small.px.phone).toBeGreaterThanOrEqual(12);
    expect(body.px.phone).toBeGreaterThanOrEqual(16);
  });

  it("has oversize landing roles that land on the documented px, are tracked negatively and mirror in css", () => {
    for (const role of Object.keys(bigScale) as (keyof typeof bigScale)[]) {
      const { size, px, tracking: track } = bigScale[role];
      expect(Math.round(clampAt(size, 390))).toBe(px.phone);
      expect(Math.round(clampAt(size, 1440))).toBe(px.desktop);
      expect(String(track).startsWith("-")).toBe(true);
      expect(css).toContain(`--ds-size-${role}: ${size};`);
      expect(bigStyle(role).fontSize).toBe(size);
    }
    expect(bigScale.hero.px.desktop).toBeGreaterThan(typeScale.display.px.desktop);
    expect(bigScale.mega.px.desktop).toBeGreaterThan(bigScale.hero.px.desktop);
  });

  it("tracks only the display size, and only negatively", () => {
    expect(tracking.display.startsWith("-")).toBe(true);
    expect(typeScale.display.tracking).toBe(tracking.display);
    for (const role of ["title", "body", "label", "small"] as const) expect(typeScale[role].tracking).toBe(0);
    expect(textStyle("label").letterSpacing).toBe(0);
  });

  it("has the spacing, border, radius, layout and motion scales", () => {
    expect(SPACE).toEqual([4, 8, 12, 16, 24, 32, 48, 64, 96]);
    expect(borders).toEqual({ hairline: 1, outline: 2.5 });
    expect(radii.none).toBe(0);
    expect(layout.gutter).toEqual({ phone: 16, desktop: 48 });
    expect(motionTokens.durations.fast).toBeLessThan(motionTokens.durations.base);
    expect(motionTokens.durations.base).toBeLessThan(motionTokens.durations.slow);
    expect(settleAfter(200)).toBe(200 + motionTokens.settleMarginMs);
  });

  it("mirrors the tokens in design.css", () => {
    for (const [name, hex] of Object.entries(colors)) expect(css).toContain(`--ds-${name}: ${hex.toLowerCase()};`);
    for (const role of Object.keys(typeScale) as TextRole[]) expect(css).toContain(`--ds-size-${role}: ${typeScale[role].size};`);
    expect(css).toContain(`--ds-gutter: ${layout.gutter.phone}px;`);
    expect(css).toContain(`--ds-gutter: ${layout.gutter.desktop}px;`);
    expect(css).toContain(`--ds-outline: ${borders.outline}px;`);
    expect(css).toContain(`--ds-ledge: ${layout.ledge}px;`);
  });
});

describe("stage tokens still derive from the design tokens", () => {
  it("shares the base colours and fonts and keeps every stage value", () => {
    expect(stage.colors).toBe(colors);
    expect(stage.fonts).toBe(fonts);
    expect(stage.alphas).toEqual({ read: 0.6, ring: 0.35, rail: 0.3 });
    expect(stage.type).toEqual({ display: 64, title: 32, body: 24, label: 18, small: 15 });
    expect(stage.tracking).toEqual({ display: "-0.02em", none: 0 });
    expect(stage.withAlpha("red", 0.5)).toBe("rgba(255, 59, 48, 0.5)");
  });
});
