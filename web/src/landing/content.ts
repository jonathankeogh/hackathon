/** Copy and data for the landing page. No dashes, no hype; the numbers on the proof strip are labelled as demo numbers. */

export type NodeId = "attendees" | "venue" | "speaker" | "laptops" | "plan";
export type MessageId = "sam" | "priya" | "dev" | "mia" | "ask" | "reply" | "booked";

export interface ChatLine {
  id: MessageId;
  who: string;
  /** The agent speaks as DEADLOCK; everyone else is a person in the group. */
  kind: "person" | "agent";
  text: string;
}

/** The demo chat from the product story: a workshop that nobody can start. */
export const CHAT: readonly ChatLine[] = [
  { id: "sam", who: "Sam", kind: "person", text: "we should run a hands-on Grok agents workshop next week" },
  { id: "priya", who: "Priya", kind: "person", text: "I can host it at our office if 15 people come" },
  { id: "dev", who: "Dev", kind: "person", text: "I'll teach it if we sort a venue" },
  { id: "mia", who: "Mia", kind: "person", text: "I'll bring the laptops once there's a venue" },
  { id: "ask", who: "Deadlock to Priya", kind: "agent", text: "12 people are confirmed. Would 12 work instead of 15?" },
  { id: "reply", who: "Priya", kind: "person", text: "yeah 12 is fine" },
  { id: "booked", who: "Deadlock", kind: "agent", text: "Booked. Thursday 19:00 at Priya's office. Invites are out." },
];

export interface NodeInfo {
  role: string;
  person: string;
  /** Short condition for compact layouts. */
  need: string;
  quote?: string;
}

export const NODES: Record<NodeId, NodeInfo> = {
  attendees: { role: "Audience", person: "Phones", need: "needs 15 people" },
  venue: { role: "Venue", person: "Priya", need: "needs 15 people", quote: "I can host it at our office if 15 people come" },
  speaker: { role: "Speaker", person: "Dev", need: "needs a venue", quote: "I'll teach it if we sort a venue" },
  laptops: { role: "Laptops", person: "Mia", need: "needs a venue", quote: "I'll bring the laptops once there's a venue" },
  plan: { role: "Plan", person: "Workshop", need: "needs all of the above", quote: "we should run a hands-on Grok agents workshop" },
};

export const NODE_IDS: readonly NodeId[] = ["attendees", "venue", "speaker", "laptops", "plan"];

export interface Plan {
  name: string;
  waitingOn: string;
}

/** What the hero departures strip cycles through. Short on purpose: they must fit a flap row. */
export const STRIP_PLANS: readonly Plan[] = [
  { name: "5-A-SIDE", waitingOn: "A PITCH" },
  { name: "WORKSHOP", waitingOn: "A VENUE" },
  { name: "CABIN TRIP", waitingOn: "12 PEOPLE" },
  { name: "SUPPER CLUB", waitingOn: "A COOK" },
  { name: "DEMO NIGHT", waitingOn: "A ROOM" },
  { name: "LISBON", waitingOn: "A DATE" },
];

/** Plans that died in group chats, for the marquee. */
export const TICKER_TOP: readonly string[] = [
  "WE SHOULD DO A 5-A-SIDE",
  "WE SHOULD RUN A WORKSHOP",
  "WE SHOULD BOOK THAT CABIN",
  "WE SHOULD START A BOOK CLUB",
  "WE SHOULD HIRE A MINIBUS",
  "WE SHOULD DO A SUPPER CLUB",
];
export const TICKER_BOTTOM: readonly string[] = [
  "WE SHOULD GO TO LISBON",
  "WE SHOULD HOST A DEMO NIGHT",
  "WE SHOULD RENT A STUDIO",
  "WE SHOULD DO A REUNION",
  "WE SHOULD SWIM AT THE PONDS",
  "WE SHOULD FINALLY MEET",
];

export interface Beat {
  n: string;
  title: string;
  body: string;
  /** What the hover reveal shows. */
  detail: string;
  lamp: "red" | "amber" | "green";
}

export const HOW: readonly Beat[] = [
  { n: "01", title: "Tag @deadlock", body: "Add it to the group. It reads the chat, quietly, and picks up the plan that keeps getting a thumbs up and nothing else.", detail: "Reads the group on WhatsApp. Sends only to the group and its members.", lamp: "red" },
  { n: "02", title: "It works out who is waiting on whom", body: "Every \"I will, if\" becomes a signal on a track. Code, not guesswork, finds the one condition holding the rest.", detail: "Grok reads the language. A solver does the sums. Grok never decides if a plan is viable.", lamp: "amber" },
  { n: "03", title: "The agent asks, the plan books", body: "It messages the person holding things up: would 12 work instead of 15? A yes loosens the condition and the line clears.", detail: "A condition only loosens after an explicit yes. Then the event page, the invites and the booking follow.", lamp: "green" },
];

export interface Proof {
  label: string;
  value: number;
  digits: number;
  note: string;
}

/** Demo numbers from rehearsal runs, labelled as such on the page. */
export const PROOF: readonly Proof[] = [
  { label: "Plans unblocked", value: 47, digits: 2, note: "in rehearsal runs" },
  { label: "People asked", value: 312, digits: 3, note: "one question each" },
  { label: "Seconds from yes to booked", value: 24, digits: 2, note: "median, demo data" },
];

export const RULES: readonly { head: string; body: string }[] = [
  { head: "Grok does language.", body: "It reads the chat and writes the questions." },
  { head: "Code does logic.", body: "A solver decides what is blocked and what is viable." },
  { head: "People say yes.", body: "A condition only loosens after an explicit yes." },
];
