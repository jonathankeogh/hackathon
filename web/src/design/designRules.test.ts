import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { alphas, colors, tracking, typeScale } from "./tokens";

/** Mirrors stage/designRules.test.ts for the web pages: this folder, the landing/sign-up flow in new/ and the presenter panel in admin/. */
const SRC = resolve(__dirname, "..");
const ROOTS = [resolve(SRC, "design"), resolve(SRC, "new"), resolve(SRC, "admin")];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx|css)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

const FILES = ROOTS.flatMap(sources).map((path) => ({ path, name: relative(SRC, path), text: readFileSync(path, "utf8") }));
const hits = (re: RegExp, files = FILES) => files.filter((f) => re.test(f.text)).map((f) => f.name);
const NOT_TOKENS = FILES.filter((f) => f.name !== "design/tokens.ts");

describe("design rules (static, design + new + admin)", () => {
  it("scans something", () => {
    expect(FILES.length).toBeGreaterThan(10);
    expect(FILES.some((f) => f.name.startsWith("new/"))).toBe(true);
    expect(FILES.some((f) => f.name.startsWith("admin/"))).toBe(true);
  });

  it("uses no font size outside the scale: no numeric fontSize, no Tailwind text-[Npx], no raw px font-size", () => {
    expect(hits(/fontSize:\s*[0-9]/, NOT_TOKENS)).toEqual([]);
    expect(hits(/text-\[\d/)).toEqual([]);
    expect(hits(/font-size:\s*\d/)).toEqual([]);
  });

  it("has a type scale where only the display size is tracked, negatively", () => {
    expect(typeScale.display.tracking).toBe(tracking.display);
    expect(tracking.display.startsWith("-")).toBe(true);
    expect(tracking.none).toBe(0);
  });

  it("has no positive letter-spacing", () => {
    expect(hits(/letterSpacing:\s*["'`]?\s*[1-9.]/)).toEqual([]);
    expect(hits(/letter-spacing:\s*(?!0[;\s}]|-)[0-9.]/)).toEqual([]);
    expect(hits(/tracking-(?:wide|wider|widest)|tracking-\[(?!-)/)).toEqual([]);
  });

  it("has no glow, blur, shadow, gradient, backdrop or brightness effect", () => {
    expect(hits(/feGaussianBlur|boxShadow|box-shadow|text-shadow|textShadow|drop-shadow|filter:|filter=|gradient|backdrop|brightness\(|blur\(/i)).toEqual([]);
  });

  it("never dims readable text below 60%", () => {
    expect(alphas.read).toBeGreaterThanOrEqual(0.6);
    expect(hits(/text-fg opacity-|opacity-[0-5]\d/)).toEqual([]);
  });

  it("has no em or en dash, and no separator dot, in source", () => {
    expect(hits(/[–—·•]/)).toEqual([]);
  });

  it("is square: the only border-radius is a disc", () => {
    expect(hits(/\brounded(?!-none)(-[a-z0-9\[\]]+)?\b/)).toEqual([]);
    const radii = FILES.flatMap((f) => (f.text.match(/border-?[rR]adius:\s*["'`]?[^;,"'`}\s]+/g) ?? []).map((m) => `${f.name}: ${m}`));
    expect(radii.filter((r) => !/(?:50%|0|radii\.none|radii\.disc)$/.test(r))).toEqual([]);
  });

  it("settle-net: framer-motion is only used where a timer or useSettleKey forces the end state", () => {
    const framer = FILES.filter((f) => /<motion\./.test(f.text) && !/useSettleKey|useSettle|useEntering/.test(f.text));
    expect(framer.map((f) => f.name)).toEqual(["design/SplitFlap.tsx"]);
  });

  it("only uses the palette: every hex colour is a token", () => {
    const allowed = new Set(Object.values(colors).map((c) => c.toLowerCase()));
    const stray = NOT_TOKENS.flatMap((f) => (f.text.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((hex) => `${f.name}: ${hex}`)).filter((line) => !allowed.has(line.slice(line.lastIndexOf("#")).toLowerCase()));
    expect(stray).toEqual([]);
  });

  it("has no emoji", () => {
    expect(hits(/\p{Extended_Pictographic}/u)).toEqual([]);
  });
});
