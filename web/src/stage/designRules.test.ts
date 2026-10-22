import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { alphas, colors, tracking, type } from "./tokens";

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx|css)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

const FILES = sources(resolve(__dirname)).map((path) => ({ path, text: readFileSync(path, "utf8") }));
const hits = (re: RegExp) => FILES.filter((f) => re.test(f.text)).map((f) => f.path.replace(resolve(__dirname) + "/", ""));

describe("design rules (static)", () => {
  it("has the fixed type scale", () => {
    expect(type).toEqual({ display: 64, title: 32, body: 24, label: 18, small: 15 });
  });

  it("uses no font size outside the scale: no numeric fontSize, no Tailwind text-[Npx]", () => {
    expect(hits(/fontSize:\s*[0-9]/)).toEqual([]);
    expect(hits(/text-\[\d/)).toEqual([]);
    expect(hits(/font-size:\s*\d/)).toEqual([]);
  });

  it("has no positive letter-spacing, and tracks only the display size", () => {
    expect(tracking.display.startsWith("-")).toBe(true);
    expect(tracking.none).toBe(0);
    expect(hits(/letterSpacing:\s*["'`]?\s*[0-9.]/)).toEqual([]);
    expect(hits(/tracking-\[(?!-)/)).toEqual([]);
  });

  it("has no glow, blur, drop shadow, gradient or brightness effect", () => {
    expect(hits(/feGaussianBlur|boxShadow|box-shadow|drop-shadow|filter:|filter=|gradient|brightness\(/i)).toEqual([]);
  });

  it("never dims readable text below 60%", () => {
    expect(alphas.read).toBeGreaterThanOrEqual(0.6);
    expect(hits(/text-fg opacity-|opacity-[0-5]\d/)).toEqual([]);
  });

  it("has no em or en dash, and no separator dot, in source copy", () => {
    const copy = FILES.filter((f) => !f.path.endsWith("plainCopy.ts"));
    expect(copy.filter((f) => /[–—·•]/.test(f.text)).map((f) => f.path)).toEqual([]);
  });

  it("settle-net: every framer-motion element is remounted at its end state by useSettleKey, except the lamp flash (cleared by the cascade sequencer net); the split-flap lives in design/ with its own timer net", () => {
    const framer = FILES.filter((f) => /<motion\./.test(f.text) && !/useSettleKey/.test(f.text));
    expect(framer.map((f) => f.path.replace(resolve(__dirname) + "/", ""))).toEqual(["components/SignalLampFx.tsx"]);
  });

  it("only uses the palette: every hex colour is a token", () => {
    const allowed = new Set(Object.values(colors).map((c) => c.toLowerCase()));
    const stray = FILES.filter((f) => !f.path.endsWith("tokens.ts"))
      .flatMap((f) => (f.text.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((hex) => `${f.path}: ${hex}`))
      .filter((line) => !allowed.has(line.slice(line.lastIndexOf("#")).toLowerCase()));
    expect(stray).toEqual([]);
  });
});
