/**
 * DEADLOCK design tokens: the single source of truth for web pages (landing, sign-up, /join,
 * /design). The stage's 1920 canvas scale lives in stage/tokens.ts and imports its base
 * colours and fonts from here. design.css mirrors these values for pseudo-class styling, and
 * tokens.test.ts keeps the two in sync.
 */
import type { CSSProperties } from "react";

/** The only colours in the product. Everything else is an opacity variant of these. */
export const colors = {
  bg: "#0E0E0C",
  text: "#EDEAE2",
  divider: "#2A2925",
  red: "#FF3B30",
  amber: "#FFB000",
  green: "#3DDC84",
} as const;

export type ColorToken = keyof typeof colors;
/** The three signal colours. They are fills and surfaces, never text colour. */
export type SignalColor = "red" | "amber" | "green";

export const fonts = {
  mono: '"IBM Plex Mono", ui-monospace, monospace',
  sans: '"IBM Plex Sans", system-ui, sans-serif',
} as const;

/**
 * Named opacity steps of the text colour. Anything meant to be read is at least `read`; the
 * lower steps are for dividers, outline rings, idle rails and hints only.
 */
export const alphas = {
  solid: 1,
  read: 0.6, // secondary text: the floor for anything readable
  hint: 0.45, // placeholder text and the ledge under a button, never body copy
  ring: 0.35, // lamp outline ring
  rail: 0.3, // idle track, connectors between steps
  wash: 0.08, // a barely-there surface tint
} as const;

export type AlphaToken = keyof typeof alphas;

/** Letter-spacing. Never positive; only the display size is tracked, slightly negative. */
export const tracking = { display: "-0.02em", none: 0 } as const;

export const fontWeights = { regular: 400, medium: 500, semibold: 600 } as const;

export type TextRole = "display" | "title" | "body" | "label" | "small";

export interface TextSpec {
  /** clamp() between the phone size and the desktop size. */
  size: string;
  /** Documented rendered px at a 390px and a 1440px viewport. */
  px: { phone: number; desktop: number };
  lineHeight: number;
  weight: number;
  family: string;
  tracking: string | number;
}

/**
 * The one type scale for web pages. Sizes are fluid: `clamp(min, intercept + slope vw, max)`
 * so they land on `px.phone` at 390 wide and `px.desktop` at 1440 wide. Labels are Plex Mono
 * capitals, everything else Plex Sans.
 */
export const typeScale: Record<TextRole, TextSpec> = {
  display: { size: "clamp(40px, 19.2px + 5.333vw, 96px)", px: { phone: 40, desktop: 96 }, lineHeight: 1, weight: fontWeights.semibold, family: fonts.sans, tracking: tracking.display },
  title: { size: "clamp(24px, 18.06px + 1.524vw, 40px)", px: { phone: 24, desktop: 40 }, lineHeight: 1.15, weight: fontWeights.semibold, family: fonts.sans, tracking: tracking.none },
  body: { size: "clamp(16px, 14.51px + 0.381vw, 20px)", px: { phone: 16, desktop: 20 }, lineHeight: 1.5, weight: fontWeights.regular, family: fonts.sans, tracking: tracking.none },
  label: { size: "clamp(14px, 13.26px + 0.19vw, 16px)", px: { phone: 14, desktop: 16 }, lineHeight: 1.2, weight: fontWeights.semibold, family: fonts.mono, tracking: tracking.none },
  small: { size: "clamp(12px, 11.26px + 0.19vw, 14px)", px: { phone: 12, desktop: 14 }, lineHeight: 1.4, weight: fontWeights.regular, family: fonts.sans, tracking: tracking.none },
};

/**
 * Oversize display roles for the landing page only (hero headline, closing call to action,
 * giant numerals). Same rule as `display`: tracked slightly negative, never positive.
 */
export const bigScale = {
  hero: { size: "clamp(40px, 13.26px + 6.857vw, 152px)", px: { phone: 40, desktop: 112 }, lineHeight: 0.98, weight: fontWeights.semibold, family: fonts.sans, tracking: tracking.display },
  mega: { size: "clamp(68px, 27.89px + 10.286vw, 232px)", px: { phone: 68, desktop: 176 }, lineHeight: 0.92, weight: fontWeights.semibold, family: fonts.sans, tracking: tracking.display },
} satisfies Record<string, TextSpec>;

export type BigRole = keyof typeof bigScale;

/** Inline style for an oversize role. */
export function bigStyle(role: BigRole): CSSProperties {
  const spec = bigScale[role];
  return { fontFamily: spec.family, fontSize: spec.size, lineHeight: spec.lineHeight, fontWeight: spec.weight, letterSpacing: spec.tracking };
}

/** Inline style for a type role. Labels are uppercased by the Label component, not here. */
export function textStyle(role: TextRole): CSSProperties {
  const spec = typeScale[role];
  return { fontFamily: spec.family, fontSize: spec.size, lineHeight: spec.lineHeight, fontWeight: spec.weight, letterSpacing: spec.tracking };
}

/** Spacing scale in px. Components take one of these values. */
export const SPACE = [4, 8, 12, 16, 24, 32, 48, 64, 96] as const;
export type Space = (typeof SPACE)[number];

/** The brand is square. Discs (lamps) are the only round thing. */
export const radii = { none: 0, disc: "50%" } as const;

/** Border widths in px: a hairline for dividers, the 2.5 outline for lamps, buttons and fields. */
export const borders = { hairline: 1, outline: 2.5 } as const;

/** Page layout: gutters 16 on phones, 48 from the breakpoint up. */
export const layout = {
  gutter: { phone: 16, desktop: 48 },
  breakpoint: 768,
  maxWidth: { narrow: 560, wide: 1200 },
  /** Smallest tap target in px. */
  touch: 48,
  /** Depth of a button's ledge in px, and how far it sinks on press. */
  ledge: 3.5,
} as const;

export const lampSizes = { sm: 16, md: 24, lg: 40 } as const;
export type LampSize = keyof typeof lampSizes;

/** Motion: fades, scales, translates and colour only. Nothing springy. */
export const motionTokens = {
  durations: { fast: 120, base: 200, slow: 400 },
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  /** Slack added after an animation before its settle-net forces the end state. */
  settleMarginMs: 300,
  /** How long a lamp flash runs. */
  flashMs: 240,
} as const;

/** When the settle-net for an animation of `ms` should fire. */
export function settleAfter(ms: number): number {
  return ms + motionTokens.settleMarginMs;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Opacity variant of a token colour, as an rgba() string. */
export function withAlpha(token: ColorToken, alpha: number): string {
  const [r, g, b] = hexToRgb(colors[token]);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Opacity variant of an arbitrary hex colour (token or person colour). */
export function hexAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
