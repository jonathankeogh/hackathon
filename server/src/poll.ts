import type { Poll, PollAnswer } from "@deadlock/shared/types";

// The phone poll once there is a plan: are you coming, what are you bringing,
// anyone with you. Options fit the plan; answers are checked here, and the
// headcount counts guests of people who said yes.

export const JUST_ME = "Just me";
export const MAX_GUESTS = 5;
const MAX_OPTIONS = 5;

const BY_PLAN: [RegExp, string[]][] = [
  [/\b(workshop|hack|coding|agents?|talk|meetup)\b/i, ["Laptop", "Charger", "Snacks"]],
  [/\b(match|football|premier league|grand prix|f1|nfl|game|arsenal|tottenham|chelsea)\b/i, ["Snacks", "Team shirt", "Drinks"]],
  [/\b(five-a-side|5-a-side|run|hike|climb|tennis|padel)\b/i, ["Ball", "Water", "Trainers"]],
  [/\b(quiz|games? night|board games?|darts)\b/i, ["Board games", "Cards", "Pizza"]],
  [/\b(picnic|park|bbq|barbecue)\b/i, ["Blanket", "Food to share", "Drinks"]],
  [/\b(dinner|food|curry|ramen|street food|brunch)\b/i, ["Appetite", "Cash for splitting"]],
  [/\b(gig|music|comedy)\b/i, ["Ticket", "Cash"]],
];
const FALLBACK = ["Snacks", "Drinks", "Games"];

/** Options for "what are you bringing": the plan's kind, then kit the chat mentioned, then "Just me". */
export function bringOptionsFor(planTitle: string, chatKit: string[] = []): string[] {
  const base = BY_PLAN.find(([re]) => re.test(planTitle))?.[1] ?? FALLBACK;
  const picks = [...new Set([...base, ...chatKit])].slice(0, MAX_OPTIONS - 1);
  return [...picks, JUST_ME];
}

/** Clean one phone's answer, or null if it isn't one. "Just me" stands alone. */
export function cleanAnswer(poll: Poll, raw: Partial<PollAnswer> & { personId: string }): PollAnswer | null {
  if (raw.going !== "yes" && raw.going !== "maybe" && raw.going !== "no") return null;
  let bring = Array.isArray(raw.bring) ? [...new Set(raw.bring.filter((b) => typeof b === "string" && poll.bringOptions.includes(b)))] : [];
  if (bring.includes(JUST_ME) && bring.length > 1) bring = bring.filter((b) => b !== JUST_ME);
  const guests = Math.max(0, Math.min(MAX_GUESTS, Math.floor(Number(raw.guests) || 0)));
  // Not coming: nothing to bring, nobody with you.
  return raw.going === "no" ? { personId: raw.personId, going: "no", bring: [], guests: 0 } : { personId: raw.personId, going: raw.going, bring, guests };
}

/**
 * Heads a set of joined phones adds: each counts unless it answered maybe or
 * no; guests count for a yes.
 */
export function phoneHeads(phoneIds: string[], poll: Poll | null | undefined): number {
  let n = 0;
  for (const id of phoneIds) {
    const a = poll?.answers.find((x) => x.personId === id);
    if (!a) n++;
    else if (a.going === "yes") n += 1 + a.guests;
  }
  return n;
}

/** "Laptop" ×4 etc, for the solver's counts and the stage manifest. */
export function bringTotals(poll: Poll | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of poll?.answers ?? []) {
    if (a.going !== "yes") continue;
    for (const b of a.bring) if (b !== JUST_ME) out[b] = (out[b] ?? 0) + 1;
  }
  return out;
}
