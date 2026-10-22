/** Pure logic of the organiser flow: which screen to show, sign-up validation, QR sizing. */

export type WaConnection = "offline" | "connecting" | "qr" | "connected";

export interface WaStatus {
  status: WaConnection;
  qr?: string;
  /** Set once a plan is running in a chat. */
  active?: { jid: string; name: string } | null;
}

/** Where the organiser is: reading the landing page, filling the form, or linking WhatsApp. */
export type Phase = "idle" | "signup" | "started";

export type FlowStep = "landing" | "signup" | "scan" | "live";

export const MAX_NAME = 40;

/** The three steps the StepRail shows. The landing page is outside the rail. */
export const RAIL_STEPS = [
  { id: "signup", label: "You" },
  { id: "scan", label: "Link" },
  { id: "live", label: "Live" },
] as const;

export function selectStep(phase: Phase, wa: WaStatus | null): FlowStep {
  if (phase === "idle") return "landing";
  if (phase === "signup") return "signup";
  return wa?.status === "connected" ? "live" : "scan";
}

/** A linked bridge or a running plan: the landing page offers the stage instead of sign-up. */
export function isLive(wa: WaStatus | null): boolean {
  return Boolean(wa && (wa.active || wa.status === "connected"));
}

/** A usable QR to draw: status qr and a payload. */
export function qrPayload(wa: WaStatus | null): string | null {
  return wa?.status === "qr" && wa.qr ? wa.qr : null;
}

export interface WaState {
  wa: WaStatus | null;
  /** After "wa:new" the server may still report the old link for a poll or two; ignore it. */
  awaitingFresh: boolean;
}

export type WaEvent = { type: "status"; status: WaStatus } | { type: "started" };

export const initialWaState: WaState = { wa: null, awaitingFresh: false };

export function reduceWa(state: WaState, event: WaEvent): WaState {
  if (event.type === "started") return { wa: { status: "connecting", active: null }, awaitingFresh: true };
  if (state.awaitingFresh && (event.status.status === "connected" || event.status.active)) return state;
  return { wa: event.status, awaitingFresh: false };
}

export interface SignupValues {
  name: string;
  email: string;
}

export type SignupErrors = Partial<Record<keyof SignupValues, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateSignup(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Enter your first name.";
  else if (name.length > MAX_NAME) errors.name = `Keep it under ${MAX_NAME} characters.`;
  const email = values.email.trim();
  if (!email) errors.email = "Enter your email address.";
  else if (!EMAIL.test(email)) errors.email = "That email does not look right. Try name@example.com.";
  return errors;
}

export function cleanSignup(values: SignupValues): SignupValues {
  return { name: values.name.trim(), email: values.email.trim() };
}

export function liveHeading(name: string): string {
  return name.trim() ? `You\u2019re live, ${name.trim()}.` : "You\u2019re live.";
}

/**
 * Edge of the link QR in px. Fills the width on a phone (at least 260 where the viewport
 * allows), leaves room for the heading and instruction on short screens, and stops at 440.
 */
export function qrSize(viewportWidth: number, viewportHeight: number, gutter: number): number {
  const byWidth = viewportWidth - gutter * 2;
  const byHeight = Math.max(260, viewportHeight - 380);
  return Math.floor(Math.min(440, byWidth, byHeight));
}

/** Milliseconds before the scan screen mentions the bridge command. */
export const BRIDGE_HINT_MS = 8000;
