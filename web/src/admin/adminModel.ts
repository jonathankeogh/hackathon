import type { Ask } from "@deadlock/shared/types";
import type { StateV2 } from "../stage/data/v2types";

/** The line the presenter sends from WhatsApp (CLAUDE.md section 11, beat 2). */
export const TRIGGER = "we should run a hands-on Grok agents workshop next week";

export type StepKey = "detect" | "extract" | "explain" | "join" | "negotiate" | "answer" | "cascade" | "book" | "call";
export type BeatStatus = "done" | "current" | "upcoming";

export interface Beat {
  key: StepKey;
  title: string;
  hint: string;
  status: BeatStatus;
}

/** What the server state cannot tell us: things only this page knows. */
export interface BeatContext {
  /** The call was rung from this page. The server keeps no "called" flag. */
  called: boolean;
  /** Name of the chosen call target, or null for "most recent phone". */
  callTargetName: string | null;
}

export const isPhone = (p: { source: string }) => p.source === "phone";
export const openAskOf = (state: StateV2): Ask | undefined => state.asks.find((a) => a.status === "open");
const finishedPlan = (state: StateV2) => state.plan?.status === "viable" || state.plan?.status === "booked";

/** The newest line the agent wrote, or null. */
export function lastAgentLine(state: StateV2): string | null {
  return state.agentLog.length ? state.agentLog[state.agentLog.length - 1] : null;
}

function answerHint(state: StateV2, done: boolean): string {
  const open = openAskOf(state);
  if (open) return open.question;
  if (!done) return "Waiting for the agent to ask";
  return state.asks.some((a) => a.status !== "open") ? "Answered" : "No ask was needed";
}

/** done / not done for every beat, straight from the server state. */
function doneMap(state: StateV2, ctx: BeatContext): Record<StepKey, boolean> {
  const finished = finishedPlan(state);
  const decided = state.asks.some((a) => a.status !== "open");
  return {
    detect: Boolean(state.plan && state.plan.status !== "none"),
    extract: state.commitments.length > 0,
    explain: state.explanation.trim() !== "",
    join: state.attendeeCount >= state.attendeeTarget || state.asks.length > 0 || finished,
    negotiate: state.asks.length > 0 || finished,
    answer: !openAskOf(state) && (decided || finished),
    cascade: finished,
    book: state.plan?.status === "booked" || state.event !== null,
    call: ctx.called,
  };
}

/**
 * The demo beats in running order with their lamp state: done (green), current (amber), upcoming
 * (off). The current beat is the first one not done; an open ask always takes it, because that
 * is the one thing on stage waiting for the presenter's thumb.
 */
export function runSheet(state: StateV2, ctx: BeatContext): Beat[] {
  const done = doneMap(state, ctx);
  const order: StepKey[] = ["detect", "extract", "explain", "join", "negotiate", "answer", "cascade", "book", "call"];
  const current: StepKey | undefined = openAskOf(state) ? "answer" : order.find((k) => !done[k]);
  const short = Math.max(0, state.attendeeTarget - state.attendeeCount);
  const text: Record<StepKey, [string, string]> = {
    detect: ["Detect the plan", "Posts the trigger line, the plan goes blocked"],
    extract: ["Extract the conditions", "Grok re-reads the chat for commitments"],
    explain: ["Explain why it is stuck", "Re-runs the Why it's stuck panel"],
    join: ["Audience joins", `${state.attendeeCount} of ${state.attendeeTarget} in${short ? `, ${short} short` : ""}`],
    negotiate: ["Ask the bottleneck", lastAgentLine(state) ?? "The agent asks the blocking person to bend"],
    answer: ["Accept the open ask", answerHint(state, done.answer)],
    cascade: ["Cascade to viable", "Tops up attendees and unlocks the whole chain"],
    book: ["Book it", "Event page, invites and the WhatsApp post"],
    call: ["Ring the call target", ctx.callTargetName ? `Rings ${ctx.callTargetName}` : "Rings the most recent phone"],
  };
  return order.map((key) => ({
    key,
    title: text[key][0],
    hint: text[key][1],
    status: done[key] ? "done" : key === current ? "current" : "upcoming",
  }));
}

export type CellFill = "red" | "amber" | "green" | "off";

/** The plan status as a small filled cell: its label and the signal fill behind it. */
export function planCell(state: StateV2): { label: string; fill: CellFill } {
  switch (state.plan?.status) {
    case "blocked":
      return { label: "BLOCKED", fill: "red" };
    case "viable":
      return { label: "VIABLE", fill: "green" };
    case "booked":
      return { label: "BOOKED", fill: "green" };
    default:
      return { label: "NO PLAN", fill: "off" };
  }
}

/** Where the chat comes from, as plain words (separator characters in server labels are dropped). */
export function chatSourceLabel(state: StateV2): string {
  const label = state.chatSource?.label;
  if (label) return label.replace(/[\u00B7\u2022\u2013\u2014]/g, " ").replace(/\s+/g, " ").trim();
  return state.people.some((p) => p.source === "whatsapp") ? "WHATSAPP" : "SEED";
}

/** The persona the chat box sends as: the picked one if it still exists, else the host, else the first. */
export function effectivePersona(state: StateV2, pickedId: string): string {
  const ids = state.people.map((p) => p.id);
  if (ids.includes(pickedId)) return pickedId;
  if (ids.includes("p-host")) return "p-host";
  return ids[0] ?? "";
}

const condText = (r: { resource: string; minCount?: number }) => (r.minCount ? `${r.minCount}+ ${r.resource}` : r.resource);

/** One plain line on what a yes changes, built from the ask's proposal and the commitment it touches. */
export function proposalLine(state: StateV2, ask: Ask): string {
  const needs = ask.proposal.requires.map(condText).join(", ") || "nothing";
  const commitment = state.commitments.find((c) => c.id === ask.proposal.commitmentId);
  return commitment ? `If yes: the ${commitment.offers} needs ${needs}` : `If yes: the condition becomes ${needs}`;
}

export const personName = (state: StateV2, id: string): string => state.people.find((p) => p.id === id)?.name ?? "Someone";
