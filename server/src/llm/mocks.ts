import type { Ask, Commitment, Condition, EventDetails, Message, Person, Plan, State } from "@deadlock/shared/types";

// Offline answers: used when MOCK_LLM=true, there's no key, or Grok fails.
// Data matches the seeded chat in seed.ts; no network calls.

const CHUNK_MS = Number(process.env.EXPLAIN_CHUNK_MS ?? 60);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const stubCommitments: (Omit<Commitment, "quote" | "status"> & { messageId: string })[] = [
  { id: "c-venue", personId: "p-priya", messageId: "m6", offers: "venue", requires: [{ resource: "attendees", minCount: 15 }] },
  { id: "c-speaker", personId: "p-sam", messageId: "m5", offers: "speaker", requires: [{ resource: "venue" }] },
  { id: "c-food", personId: "p-dan", messageId: "m7", offers: "food", requires: [{ resource: "venue" }] },
];

export async function detectAndExtract(
  messages: Message[],
  _people: Person[],
): Promise<{ plan: Plan | null; commitments: Commitment[] }> {
  const trigger = messages.find((m) => /@deadlock|\bwe should\b/i.test(m.text));
  if (!trigger) return { plan: null, commitments: [] };

  const byId = new Map(messages.map((m) => [m.id, m]));
  const commitments = stubCommitments.flatMap(({ messageId, ...c }) => {
    const msg = byId.get(messageId);
    return msg ? [{ ...c, quote: msg.text, status: "waiting" as const }] : [];
  });

  return {
    plan: {
      id: "plan-1",
      title: "Hands-on Grok agents workshop",
      status: "blocked",
      requiredForPlan: ["speaker", "venue", "attendees"],
    },
    commitments,
  };
}

export async function explain(state: State, onChunk: (t: string) => void): Promise<string> {
  const text = stubExplanation(state);
  for (const word of text.split(/(?<= )/)) {
    if (CHUNK_MS) await sleep(CHUNK_MS);
    onChunk(word);
  }
  return text;
}

function stubExplanation(state: State): string {
  const name = (personId: string) => state.people.find((p) => p.id === personId)?.name ?? "someone";
  const venue = state.commitments.find((c) => c.offers === "venue");
  const speaker = state.commitments.find((c) => c.offers === "speaker");
  const attendees = state.blocking.find((b) => b.resource === "attendees");

  if (attendees && venue && speaker) {
    const more = Math.max(0, (attendees.minCount ?? 1) - state.attendeeCount);
    const people = more === 1 ? "person" : "people";
    return `Everything hinges on attendance: ${more} more ${people} unlocks ${name(venue.personId)}'s office, which unlocks ${name(speaker.personId)}'s talk.`;
  }
  if (state.blocking.length === 0) return "Nothing is blocking: every condition is met and the plan is ready to book.";
  return `Waiting on ${state.blocking.map((b) => b.resource).join(" and ")} before anything else can move.`;
}

export async function book(
  state: State,
): Promise<{ event: EventDetails; invites: Record<string, string>; callScript: string }> {
  const event: EventDetails = {
    title: state.plan?.title ?? "Hands-on Grok agents workshop",
    when: "Thu 29 Oct, 18:30",
    where: "Priya's office, Shoreditch",
    agenda: [
      "18:30 Pizza and setup",
      "18:45 Sam: agents on the Grok API, from zero to tool calls",
      "19:30 Build your own agent, in pairs",
      "20:30 Demos and drinks",
    ],
    blurb: "Two hours, one laptop each, and a working Grok agent by the end. Sam teaches, Priya hosts, Dan brings pizza.",
  };
  const invites: Record<string, string> = {};
  for (const p of state.people.filter((p) => p.source === "phone")) {
    invites[p.id] = `${p.name}, you're in. Grok agents workshop, Thursday 18:30 at Priya's office in Shoreditch. Bring a laptop.`;
  }
  const callScript =
    "Hi, it's Deadlock. The Grok agents workshop is on: Thursday at half six at Priya's office in Shoreditch, and you're on the list. Bring a laptop, Sam is teaching and Dan is bringing pizza.";
  return { event, invites, callScript };
}

export interface Delta {
  upserts: Commitment[];
  removes: string[];
  askReply: { askId: string; accept: boolean } | null;
}

/** Offline: only answers to an open ask are understood (yes/no words). */
export function extractDelta(newMessages: Message[], state: State): Delta {
  const ask = state.asks.find((a) => a.status === "open");
  const reply = ask && newMessages.find((m) => m.personId === ask.personId);
  let askReply: Delta["askReply"] = null;
  if (ask && reply) {
    if (/\b(no|nah|nope|can't|cannot)\b/i.test(reply.text)) askReply = { askId: ask.id, accept: false };
    else if (/\b(yes|yeah|yep|yup|sure|fine|ok|okay|works|deal|go on)\b/i.test(reply.text)) askReply = { askId: ask.id, accept: true };
  }
  return { upserts: [], removes: [], askReply };
}

export type NegotiateResult =
  | { action: "ask"; ask: Omit<Ask, "id" | "status"> }
  | { action: "wait"; reason: string };

/** Offline: lower the headcount bar to whoever is already in. */
export function negotiate(state: State): NegotiateResult {
  const have = state.attendeeCount;
  const c = state.commitments.find(
    (c) => c.status === "waiting" && c.requires.some((r) => r.resource === "attendees" && (r.minCount ?? 0) > have),
  );
  if (!c || have < 1) return { action: "wait", reason: "nothing close enough to loosen" };
  const name = state.people.find((p) => p.id === c.personId)?.name ?? "there";
  const requires: Condition[] = c.requires.map((r) => (r.resource === "attendees" ? { ...r, minCount: have } : r));
  return {
    action: "ask",
    ask: {
      personId: c.personId,
      question: `${name}, ${have} people are in, would that be enough for the ${c.offers}?`,
      proposal: { commitmentId: c.id, requires },
    },
  };
}
