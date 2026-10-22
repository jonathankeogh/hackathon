import { z } from "zod";
import type { Commitment, Condition, EventDetails, MeetExtras, Message, Person, Plan, State } from "@deadlock/shared/types";
import { callGrokJSON, streamGrok } from "./client";
import * as mock from "./mocks";
import { BOOK_SYSTEM, DELTA_SYSTEM, EXPLAIN_SYSTEM, EXTRACT_SYSTEM, NEARBY_SYSTEM, NEGOTIATE_SYSTEM } from "./prompts";

export { setMockMode, live } from "./client";
export type { Delta, NegotiateResult } from "./mocks";

// Grok reads language; everything it returns is checked against the real
// chat here (people exist, quotes are real, keys normalised) before the
// solver sees it.

const BEFORE_TRIGGER = 12; // context kept before the @deadlock message on a full read
const TRIGGER = /@deadlock|\bwe should\b/i;

const condition = z.object({
  resource: z.string().min(1),
  minCount: z.number().int().positive().optional().nullable(),
});
const rawCommitment = z.object({
  id: z.string().optional().nullable(),
  personId: z.string(),
  messageId: z.string().optional().nullable(),
  offers: z.string().min(1),
  requires: z.array(condition).default([]),
  quote: z.string().default(""),
});
type RawCommitment = z.infer<typeof rawCommitment>;

const extractSchema = z.object({
  plan: z.object({ title: z.string().min(1), triggerMessageId: z.string().optional().nullable() }).nullable(),
  commitments: z.array(rawCommitment).default([]),
  requiredForPlan: z.array(z.string()).default([]),
});

const deltaSchema = z.object({
  upserts: z.array(rawCommitment).default([]),
  removes: z.array(z.string()).default([]),
  askReply: z.object({ accept: z.boolean() }).nullable().optional(),
});

const negotiateSchema = z.union([
  z.object({
    action: z.literal("ask"),
    personId: z.string(),
    commitmentId: z.string(),
    requires: z.array(condition),
    question: z.string().min(1),
  }),
  z.object({ action: z.literal("wait"), reason: z.string().default("") }),
]);

const bookSchema = z.object({
  event: z.object({
    title: z.string(),
    when: z.string(),
    where: z.string(),
    agenda: z.array(z.string()).min(1),
    blurb: z.string(),
  }),
  invites: z.record(z.string()).default({}),
  callScript: z.string().min(1),
});

const nearbySchema = z.object({
  nearby: z.array(z.string().min(1)).min(1),
  travel: z.string().nullable().optional(),
});

// ───────────── helpers ─────────────

const key = (k: string) => k.trim().toLowerCase();

function chatLines(messages: Message[], people: Person[]): string {
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? "Someone";
  return messages.map((m) => `[${m.id}] ${name(m.personId)} (${m.personId}): ${m.text}`).join("\n");
}

function conditions(raw: z.infer<typeof condition>[]): Condition[] {
  return raw.map((r) => (r.minCount ? { resource: key(r.resource), minCount: r.minCount } : { resource: key(r.resource) }));
}

/** Grok output → real Commitment, or null if it doesn't match the chat. */
function clean(raw: RawCommitment, messages: Message[], people: Person[]): Commitment | null {
  const offers = key(raw.offers);
  if (!people.some((p) => p.id === raw.personId)) return null;
  const own = messages.filter((m) => m.personId === raw.personId);
  const quote = raw.quote.trim();
  // Keep Grok's quote only if it really is in one of their messages.
  const source =
    own.find((m) => m.id === raw.messageId && (!quote || m.text.includes(quote))) ??
    own.find((m) => quote && m.text.toLowerCase().includes(quote.toLowerCase())) ??
    own.find((m) => m.id === raw.messageId);
  if (!source) return null;
  return {
    id: raw.id || `c-${raw.personId}-${offers}`,
    personId: raw.personId,
    offers,
    requires: conditions(raw.requires).filter((r) => r.resource !== offers),
    quote: quote && source.text.includes(quote) ? quote : source.text,
    status: "waiting",
  };
}

function dedupe(list: Commitment[]): Commitment[] {
  return [...new Map(list.map((c) => [c.id, c])).values()];
}

function describe(state: State): string {
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;
  const lines = state.commitments.map(
    (c) =>
      `${c.id}: ${name(c.personId)} (${c.personId}) offers ${c.offers}` +
      (c.requires.length
        ? ` if ${c.requires.map((r) => (r.minCount ? `${r.minCount}+ ${r.resource}` : r.resource)).join(" and ")}`
        : " (no conditions)") +
      ` [${c.status}]`,
  );
  return [
    `Plan: ${state.plan?.title ?? "none"} (${state.plan?.status ?? "none"})`,
    `Needs: ${state.plan?.requiredForPlan.join(", ") ?? ""}`,
    `Headcount: ${state.attendeeCount} people in`,
    `Commitments:\n${lines.join("\n") || "(none)"}`,
    `Blocking: ${state.blocking.map((b) => (b.minCount ? `${b.minCount} ${b.resource}` : b.resource)).join(", ") || "nothing"}`,
  ].join("\n");
}

// ───────────── Call A: full read ─────────────

export async function detectAndExtract(
  messages: Message[],
  people: Person[],
): Promise<{ plan: Plan | null; commitments: Commitment[] }> {
  // Read around the latest trigger, not the whole history: older chatter is noise.
  let at = messages.length - 1;
  while (at > 0 && !TRIGGER.test(messages[at].text)) at--;
  const recent = messages.slice(Math.max(0, at - BEFORE_TRIGGER));
  const r = await callGrokJSON("extract", EXTRACT_SYSTEM, `Chat:\n${chatLines(recent, people)}`, extractSchema, () => null);
  if (!r) return mock.detectAndExtract(messages, people);
  if (!r.plan) return { plan: null, commitments: [] };
  const commitments = dedupe(r.commitments.map((c) => clean(c, recent, people)).filter((c): c is Commitment => !!c));
  const offered = new Set(commitments.map((c) => c.offers));
  // A requirement nobody offers could never unlock; keep only satisfiable ones.
  let required = [...new Set(r.requiredForPlan.map(key))].filter((k) => k === "attendees" || offered.has(k));
  if (!required.includes("attendees")) required = ["attendees", ...required];
  return {
    plan: { id: "plan-1", title: r.plan.title, status: "blocked", requiredForPlan: required },
    commitments,
  };
}

// ───────────── per-message update ─────────────

export async function extractDelta(newMessages: Message[], state: State): Promise<mock.Delta> {
  const ask = state.asks.find((a) => a.status === "open");
  const askedName = ask && state.people.find((p) => p.id === ask.personId)?.name;
  const user = [
    describe(state),
    ask ? `Open question from the bot to ${askedName} (${ask.personId}): "${ask.question}"` : "Open question: none",
    `New messages:\n${chatLines(newMessages, state.people)}`,
  ].join("\n\n");

  const r = await callGrokJSON("delta", DELTA_SYSTEM, user, deltaSchema, () => null);
  if (!r) return mock.extractDelta(newMessages, state);

  const existing = new Set(state.commitments.map((c) => c.id));
  // An "update" that changes what is offered is really a new offer.
  const sameOffer = (id: string, offers: string) =>
    state.commitments.some((c) => c.id === id && c.offers === key(offers));
  const upserts = r.upserts
    .flatMap((u) => {
      // "laptops,projector": keep only what this person didn't already offer.
      const parts = u.offers.split(/,| and /).map(key).filter(Boolean);
      if (parts.length < 2) return [u];
      const had = new Set(state.commitments.filter((c) => c.personId === u.personId).map((c) => c.offers));
      return parts.filter((o) => !had.has(o)).map((o) => ({ ...u, id: null, offers: o }));
    })
    .map((u) => clean({ ...u, id: u.id && existing.has(u.id) && sameOffer(u.id, u.offers) ? u.id : null }, newMessages, state.people))
    .filter((c): c is Commitment => !!c);
  return {
    upserts: dedupe(upserts),
    removes: r.removes.filter((id) => existing.has(id)),
    // Only the asked person can answer the ask.
    askReply: ask && r.askReply && newMessages.some((m) => m.personId === ask.personId)
      ? { askId: ask.id, accept: r.askReply.accept }
      : null,
  };
}

// ───────────── agent: break the deadlock ─────────────

export async function negotiate(state: State): Promise<mock.NegotiateResult> {
  const r = await callGrokJSON("negotiate", NEGOTIATE_SYSTEM, describe(state), negotiateSchema, () => null);
  if (!r) return mock.negotiate(state);
  if (r.action === "wait") return { action: "wait", reason: r.reason };

  // The commitment id decides who is asked; Grok's personId is often just a name.
  const c = state.commitments.find((c) => c.id === r.commitmentId);
  const requires = conditions(r.requires);
  if (!c || !loosens(c.requires, requires)) {
    console.warn(`[grok] negotiate: rejected proposal ${JSON.stringify(r)}; using mock`);
    return mock.negotiate(state);
  }
  return { action: "ask", ask: { personId: c.personId, question: r.question, proposal: { commitmentId: c.id, requires } } };
}

/** True if `next` only drops conditions or lowers minCounts of `prev`. */
export function loosens(prev: Condition[], next: Condition[]): boolean {
  if (!next.every((n) => prev.some((p) => p.resource === n.resource && (n.minCount ?? 1) <= (p.minCount ?? 1)))) return false;
  const same = next.length === prev.length && next.every((n) => prev.some((p) => p.resource === n.resource && p.minCount === n.minCount));
  return !same;
}

// ───────────── Call B: why it's stuck ─────────────

export async function explain(state: State, onChunk: (t: string) => void): Promise<string> {
  return streamGrok("explain", EXPLAIN_SYSTEM, describe(state), onChunk, (cb) => mock.explain(state, cb));
}

// ───────────── Call C: book it ─────────────

export async function book(
  state: State,
  extras?: MeetExtras,
): Promise<{ event: EventDetails; invites: Record<string, string>; callScript: string }> {
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;
  const phones = state.people.filter((p) => p.source === "phone");
  const user = [
    describe(state),
    `Who offered what: ${state.commitments.map((c) => `${name(c.personId)} -> ${c.offers} ("${c.quote}")`).join("; ")}`,
    `Today: ${new Date().toDateString()}`,
    `Practical notes from the chat (mention what to bring in invites if any): ${extras?.tips.map((t) => `${t.kind}: ${t.label}`).join("; ") || "none"}`,
    `Write invites for these personIds: ${phones.map((p) => `${p.id} (${p.name})`).join(", ") || "none"}`,
  ].join("\n\n");
  const r = await callGrokJSON("book", BOOK_SYSTEM, user, bookSchema, () => null);
  if (!r) return mock.book(state);
  return { event: { ...r.event, agenda: r.event.agenda.slice(0, 4) }, invites: r.invites, callScript: r.callScript };
}

// ───────────── things to do nearby ─────────────

/** Grok's ideas for the area around the venue, or null (callers keep the area guide). */
export async function suggestNearby(
  state: State,
  event: EventDetails,
  extras: MeetExtras,
): Promise<{ nearby: string[]; travel: string | null } | null> {
  const ideas = extras.tips.filter((t) => t.kind === "activity").map((t) => t.label);
  const user = [
    `Plan: ${event.title}`,
    `When: ${event.when}`,
    `Where: ${event.where}${extras.area ? ` (area: ${extras.area})` : ""}`,
    `Group size: ${state.attendeeCount}`,
    `Ideas from the chat: ${ideas.join("; ") || "none"}`,
  ].join("\n");
  const r = await callGrokJSON("nearby", NEARBY_SYSTEM, user, nearbySchema, () => null);
  if (!r) return null;
  const clip = (t: string) => t.trim().slice(0, 80);
  return { nearby: [...new Set(r.nearby.map(clip).filter(Boolean))].slice(0, 4), travel: r.travel?.trim() ? clip(r.travel) : null };
}
