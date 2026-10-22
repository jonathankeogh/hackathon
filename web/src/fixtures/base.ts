import type { Commitment, EventDetails, Person, Plan } from "@deadlock/shared/types";
import type { MessageV2, StateV2 } from "../stage/data/v2types";

/**
 * Shared pieces of the demo scenario (CLAUDE.md section 2): a London tech community chat
 * that wants a hands-on Grok agents workshop, but everyone is waiting on someone else.
 *
 * Person colours are the one deliberate exception to the 6-token palette: they are a data
 * field the server fills, and names must stay distinguishable. They are muted on purpose.
 */
export const PERSON_COLORS = ["#C9B79C", "#9FB3A8", "#B8A1A1", "#A9A9C2", "#C2B280", "#9DB4C0"] as const;

export const people: Person[] = [
  { id: "p1", name: "Priya Nair", color: PERSON_COLORS[0], source: "seed" },
  { id: "p2", name: "Sam Okafor", color: PERSON_COLORS[1], source: "seed" },
  { id: "p3", name: "Dani Kowalski", color: PERSON_COLORS[2], source: "seed" },
  { id: "p4", name: "Tom Whitfield", color: PERSON_COLORS[3], source: "seed" },
  { id: "p5", name: "Mei Chen", color: PERSON_COLORS[4], source: "seed" },
  { id: "p6", name: "Jamal Ahmed", color: PERSON_COLORS[5], source: "seed" },
];

/** Thursday 22 Oct 2026, 18:00 London time (BST, UTC+1), as epoch ms. */
const CHAT_START = Date.UTC(2026, 9, 22, 17, 0, 0);
const at = (minutes: number): number => CHAT_START + minutes * 60_000;

export const messages: MessageV2[] = [
  { id: "m1", personId: "p6", ts: at(2), text: "has anyone actually tried the new grok agent stuff yet? the tool calling is properly good" },
  { id: "m2", personId: "p4", ts: at(4), text: "a bit, got it booking me restaurants. still flaky when the menu changes though" },
  { id: "m3", personId: "p5", ts: at(5), text: "honestly we should run a hands-on Grok agents workshop next week" },
  { id: "m4", personId: "p3", ts: at(6), text: "yes please, i'd learn way more building one than sitting through a talk" },
  { id: "m5", personId: "p1", ts: at(8), text: "our office works if 15+ come, it's in Shoreditch and we have the space but not for fewer" },
  { id: "m6", personId: "p2", ts: at(9), text: "i'll teach it if we get a venue, the demo repo is basically ready" },
  { id: "m7", personId: "p6", ts: at(11), text: "i'm in, thursday evening suits me" },
  { id: "m8", personId: "p3", ts: at(12), text: "i'll bring laptops if we get a room, i've got 8 loaners all set up already" },
  { id: "m9", personId: "p5", ts: at(14), text: "i'll sort pizza if we have a speaker, don't want to order for nobody" },
  { id: "m10", personId: "p4", ts: at(15), text: "so we're all waiting on each other. classic" },
];

const waiting = (c: Omit<Commitment, "status">): Commitment => ({ ...c, status: "waiting" });

/** All four commitments, all waiting. */
export const waitingCommitments: Commitment[] = [
  waiting({
    id: "c1", personId: "p1", offers: "venue",
    requires: [{ resource: "attendees", minCount: 15 }],
    quote: "our office works if 15+ come",
  }),
  waiting({
    id: "c2", personId: "p2", offers: "speaker",
    requires: [{ resource: "venue" }],
    quote: "i'll teach it if we get a venue",
  }),
  waiting({
    id: "c3", personId: "p3", offers: "laptops",
    requires: [{ resource: "venue" }],
    quote: "i'll bring laptops if we get a room",
  }),
  waiting({
    id: "c4", personId: "p5", offers: "food",
    requires: [{ resource: "speaker" }],
    quote: "i'll sort pizza if we have a speaker",
  }),
];

/** Immutable helper: the same commitments with the given ids unlocked. */
export function withUnlocked(commitments: readonly Commitment[], ids: readonly string[]): Commitment[] {
  return commitments.map((c) => (ids.includes(c.id) ? { ...c, status: "unlocked" as const } : c));
}

export const TITLE = "Hands-on Grok agents workshop";

export function makePlan(status: Plan["status"]): Plan {
  return {
    id: "plan1",
    title: TITLE,
    status,
    requiredForPlan: ["attendees", "venue", "speaker", "laptops"],
  };
}

export const eventDetails: EventDetails = {
  title: TITLE,
  when: "THU 29 OCT 18:30",
  where: "Priya's office, Shoreditch, London",
  agenda: [
    "18:30 Doors, pizza and laptops handed out",
    "18:45 How a Grok agent actually works, in ten minutes",
    "19:00 Build your own agent, with Sam walking the room",
    "20:15 Show and tell, then drinks",
  ],
  blurb:
    "Fifteen of us, one room in Shoreditch, and a working agent each by the end of the night. Laptops provided, pizza on Mei.",
};

/** Skeleton shared by every fixture; each fixture overrides what differs. */
export const baseState: StateV2 = {
  people,
  messages,
  plan: null,
  commitments: [],
  attendeeCount: 3,
  attendeeTarget: 15,
  blocking: [],
  explanation: "",
  event: null,
  mock: true,
  asks: [],
  agentLog: [],
};
