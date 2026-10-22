/**
 * DEADLOCK design tokens (CONTRACT.md). Shared with Person 4 (phone view).
 * The only colours in the product. Everything else is an opacity variant of these.
 */
export const colors = {
  bg: "#0E0E0C",
  text: "#EDEAE2",
  divider: "#2A2925",
  red: "#FF3B30",
  amber: "#FFB000",
  green: "#3DDC84",
} as const;

export type ColorToken = keyof typeof colors;

export const fonts = {
  mono: '"IBM Plex Mono", ui-monospace, monospace',
  sans: '"IBM Plex Sans", system-ui, sans-serif',
} as const;

/**
 * Named opacity steps. Anything meant to be read is at least `read`; the lower steps are for
 * outline rings, track rails and other non-text marks only.
 */
export const alphas = {
  read: 0.6, // secondary text, struck old condition, quotes, headings
  ring: 0.35, // lamp outline ring
  rail: 0.3, // idle track
} as const;

/**
 * The one type scale of the 1920x1080 canvas. No other font size appears on the stage.
 * Labels are Plex Mono 600-700, body is Plex Sans 400-500.
 */
export const type = {
  display: 64, // header board flap text, odometer value
  title: 32, // why-it's-stuck text, agent question
  body: 24, // chat text, offer labels on the track
  label: 18, // names, log lines, section headings
  small: 15, // quotes, URL
} as const;

/** Letter-spacing. Never positive; only the display size is tracked, slightly negative. */
export const tracking = { display: "-0.02em", none: 0 } as const;

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
