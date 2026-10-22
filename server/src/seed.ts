import type { Message, Person } from "@deadlock/shared/types";

// Stub seed until Person 2's seeded chat (#10) lands. The LLM stubs in
// llm/index.ts quote these messages exactly, so change them together.

export const HOST_ID = "p-host";

/** People from the chat who already said yes (last week's poll). */
export const SEED_ATTENDING = 12;

export const TRIGGER_TEXT = "we should run a hands-on Grok agents workshop next week";

export const seedPeople: Person[] = [
  { id: "p-maya", name: "Maya", color: "#9C8F7A", source: "seed" },
  { id: "p-sam", name: "Sam", color: "#7D8B74", source: "seed" },
  { id: "p-priya", name: "Priya", color: "#8C7A6B", source: "seed" },
  { id: "p-tom", name: "Tom", color: "#6F8287", source: "seed" },
  { id: "p-dan", name: "Dan", color: "#A08C5B", source: "seed" },
  { id: "p-leah", name: "Leah", color: "#857A8F", source: "seed" },
  { id: HOST_ID, name: "Host", color: "#EDEAE2", source: "seed" },
];

const lines: [id: string, personId: string, text: string][] = [
  ["m1", "p-maya", "anyone going to the xAI meetup in Shoreditch on Thursday?"],
  ["m2", "p-sam", "been building agents on the Grok API all week, the tool calling is genuinely good"],
  ["m3", "p-priya", "same, half my team is hacking on it at work"],
  ["m4", "p-tom", "someone should do a proper hands-on session, the docs only get you so far"],
  ["m5", "p-sam", "I'll teach it if we sort a venue. not doing it in the back of a pub again"],
  ["m6", "p-priya", "our office has a room for 40. I can host if 15+ people actually commit"],
  ["m7", "p-dan", "I'll bring pizza if there's a venue"],
  ["m8", "p-leah", "count me in, I'll bring my laptop"],
  ["m9", "p-maya", "12 of us said yes on last week's poll fwiw"],
  ["m10", "p-tom", "classic. everyone keen, nobody moves"],
];

export function seedMessages(now = Date.now()): Message[] {
  return lines.map(([id, personId, text], i) => ({
    id,
    personId,
    text,
    ts: now - (lines.length - i) * 4 * 60_000,
  }));
}
