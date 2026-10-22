/**
 * DEADLOCK design tokens (CONTRACT.md). Shared with Person 4 (phone view).
 * The only colours in the product. Everything else is an opacity variant of these.
 */
import { alphas as baseAlphas, colors, fonts, hexAlpha, tracking, typeScale, withAlpha } from "../design/tokens";
import type { ColorToken } from "../design/tokens";

// Base colours, fonts, tracking and the rgba helpers come from the shared design tokens.
export { colors, fonts, hexAlpha, tracking, withAlpha };
export type { ColorToken };

/**
 * Named opacity steps. Anything meant to be read is at least `read`; the lower steps are for
 * outline rings, track rails and other non-text marks only.
 */
export const alphas = {
  read: baseAlphas.read, // secondary text, struck old condition, quotes, headings
  ring: baseAlphas.ring, // lamp outline ring
  rail: baseAlphas.rail, // idle track
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

/**
 * The phone sizes: the design system's responsive scale (CSS clamp strings, 390px values in
 * `px`). A phone gets these instead of the 1920 canvas scale above.
 */
export const phoneType = {
  title: typeScale.title.px.phone,
  body: typeScale.body.px.phone,
  label: typeScale.label.px.phone,
  small: typeScale.small.px.phone,
} as const;

export const phoneSize = {
  title: typeScale.title.size,
  body: typeScale.body.size,
  label: typeScale.label.size,
  small: typeScale.small.size,
} as const;
