import type { Ask, PlanOption, PollAnswer, State, Suggestion } from "@deadlock/shared/types";
import type { LampState } from "../design";

// Pure logic for the phone view: which screen, which lamp, what the confirmation says.

export type Role = "attend" | "laptop" | "help";
export type Saved = { personId: string; name: string; role?: Role };

export type Screen = "call" | "join" | "ask" | "clear" | "invite" | "rsvp" | "suggest" | "waiting";

export const ROLE_LABEL: Record<Role, string> = {
  attend: "I'm coming",
  laptop: "I'll bring a laptop",
  help: "I can help",
};

/** Everything the screens need from the live session, or from a dev mock. */
export interface JoinModel {
  screen: Screen;
  state: State | null;
  connected: boolean;
  me: Saved | null;
  ask: Ask | null;
  invite: string | null;
  call: string | null;
  joining: boolean;
  /** The server refused a chat message from this phone (admin key set). */
  chatDenied: boolean;
  /** Dev mock only: show the connected call with this word lit instead of starting speech. */
  callPreview?: { word: number; seconds: number };
  join: (name: string) => void;
  chooseRole: (role: Role) => void;
  answerAsk: (accept: boolean) => void;
  endCall: () => void;
  sendChat: (text: string) => void;
  /** The plan ideas to vote on, or null when there are none open (or a plan already exists). */
  suggestion: Suggestion | null;
  voteSuggestion: (option: PlanOption["id"]) => void;
  /** Coming / bringing / guests, once there is a plan. */
  answerPoll: (answer: PollAnswer) => void;
}

export interface ScreenInput {
  call: string | null;
  me: Saved | null;
  ask: Ask | null;
  invite: string | null;
  state: State | null;
}

/** True when every phone in the room should turn green: viable and no invite yet. */
export function isLineClear({ me, invite, state }: Pick<ScreenInput, "me" | "invite" | "state">): boolean {
  return Boolean(me && !invite && state?.plan?.status === "viable");
}

/** The bot's plan ideas while they are open and there is no plan yet, else null. */
export function openSuggestion(state: State | null): Suggestion | null {
  const noPlan = !state?.plan || state.plan.status === "none";
  return noPlan && state?.suggestion?.status === "open" ? state.suggestion : null;
}

/**
 * One screen at a time, most urgent first: a call beats everything, then joining, the agent's
 * question, the line clearing, the invite, the RSVP, the plan ideas to vote on and finally the waiting screen.
 */
export function selectScreen(input: ScreenInput): Screen {
  if (input.call) return "call";
  if (!input.me) return "join";
  if (input.ask) return "ask";
  if (isLineClear(input)) return "clear";
  if (input.invite) return "invite";
  if (!input.me.role) return "rsvp";
  if (openSuggestion(input.state)) return "suggest";
  return "waiting";
}

export interface LampView {
  lamp: LampState;
  label: string;
  blink: boolean;
}

/** The status lamp at the top: red blocked, amber waiting, green viable or booked. */
export function lampFor(state: State | null, connected: boolean): LampView {
  if (!state) return { lamp: "amber", label: connected ? "Waiting" : "Connecting", blink: true };
  if (!connected) return { lamp: "amber", label: "Reconnecting", blink: true };
  switch (state.plan?.status) {
    case "blocked":
      return { lamp: "red", label: "Blocked", blink: false };
    case "viable":
      return { lamp: "green", label: "Line clear", blink: false };
    case "booked":
      return { lamp: "green", label: "Booked", blink: false };
    default:
      return { lamp: "amber", label: "Waiting for a plan", blink: false };
  }
}

/** This phone's place in the room: the seed attendees first, then phones in join order. */
export function placeFor(state: State, personId: string): number {
  const phones = state.people.filter((p) => p.source === "phone");
  const idx = phones.findIndex((p) => p.id === personId);
  return idx < 0 ? state.attendeeCount : state.attendeeCount - phones.length + idx + 1;
}

/** What the next attendee unlocks, read from the first waiting commitment that needs a head count. */
function unlockedBy(state: State): string | null {
  const needsPeople = state.commitments.find((c) => c.status === "waiting" && c.requires.some((r) => r.resource === "attendees"));
  return needsPeople?.offers ?? null;
}

/**
 * The line under the RSVP: "You're #13. 2 more to unlock the venue." Every clause is derived
 * from the state; when the blocker is not head count, the line says only what is true.
 */
export function rsvpLine(state: State | null, personId: string): string {
  if (!state) return "You're in.";
  const place = `You're #${placeFor(state, personId)}.`;
  const status = state.plan?.status;
  if (status === "booked") return `${place} It's booked.`;
  if (status === "viable") return `${place} The line is clear.`;
  if (!status || status === "none") return `${place} Waiting for a plan.`;
  const short = state.attendeeTarget - state.attendeeCount;
  const headCountBlocks = state.blocking.some((b) => b.resource === "attendees");
  if (short <= 0 || !headCountBlocks) return `${place} Something else is holding the plan.`;
  const what = unlockedBy(state);
  return what ? `${place} ${short} more to unlock the ${what}.` : `${place} ${short} more to reach ${state.attendeeTarget}.`;
}

/** True when it is safe to buzz: browsers block vibrate before the first tap on the page. */
export function canBuzz(): boolean {
  return navigator.userActivation?.hasBeenActive ?? true;
}

export function buzz(pattern: number | number[]): void {
  if (canBuzz()) navigator.vibrate?.(pattern);
}
