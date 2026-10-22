import { describe, expect, it } from "vitest";
import type { Poll } from "@deadlock/shared/types";
import { bringOptionsFor, bringTotals, cleanAnswer, JUST_ME, phoneHeads } from "./poll";
import { evidenceFor, TOPICS } from "./suggest";
import { seedMessagesFor } from "./seed";

describe("bringOptionsFor", () => {
  it("fits the plan, adds chat kit, ends with Just me", () => {
    expect(bringOptionsFor("Hands-on Grok agents workshop", ["Umbrella"])).toEqual(["Laptop", "Charger", "Snacks", "Umbrella", JUST_ME]);
    expect(bringOptionsFor("Match at Boxpark Shoreditch")).toEqual(["Snacks", "Team shirt", "Drinks", JUST_ME]);
    expect(bringOptionsFor("Pub quiz near Angel")).toEqual(["Board games", "Cards", "Pizza", JUST_ME]);
    expect(bringOptionsFor("Something else")).toEqual(["Snacks", "Drinks", "Games", JUST_ME]);
  });
  it("caps at five options", () => {
    expect(bringOptionsFor("workshop", ["A", "B", "C"])).toHaveLength(5);
  });
});

describe("cleanAnswer", () => {
  const poll: Poll = { bringOptions: ["Snacks", "Cards", JUST_ME], answers: [] };
  it("keeps only offered items, caps guests, and Just me stands alone", () => {
    expect(cleanAnswer(poll, { personId: "a", going: "yes", bring: ["Snacks", "Rocket", "Snacks", JUST_ME], guests: 9 })).toEqual({ personId: "a", going: "yes", bring: ["Snacks"], guests: 5 });
    expect(cleanAnswer(poll, { personId: "a", going: "yes", bring: [JUST_ME], guests: -2 })).toEqual({ personId: "a", going: "yes", bring: [JUST_ME], guests: 0 });
  });
  it("a no brings nothing and nobody; junk is refused", () => {
    expect(cleanAnswer(poll, { personId: "a", going: "no", bring: ["Snacks"], guests: 3 })).toEqual({ personId: "a", going: "no", bring: [], guests: 0 });
    expect(cleanAnswer(poll, { personId: "a", going: "sure" as never })).toBeNull();
  });
});

describe("headcount", () => {
  const poll: Poll = {
    bringOptions: [],
    answers: [
      { personId: "yes2", going: "yes", bring: ["Snacks"], guests: 2 },
      { personId: "maybe", going: "maybe", bring: [], guests: 0 },
      { personId: "no", going: "no", bring: [], guests: 0 },
      { personId: "yes0", going: "yes", bring: ["Snacks", "Cards"], guests: 0 },
    ],
  };
  it("joined phones count until they say maybe or no; a yes brings its guests", () => {
    expect(phoneHeads(["silent", "yes2", "maybe", "no", "yes0"], poll)).toBe(1 + 3 + 0 + 0 + 1);
    expect(phoneHeads(["a", "b"], null)).toBe(2);
  });
  it("totals what the yeses bring", () => {
    expect(bringTotals(poll)).toEqual({ Snacks: 2, Cards: 1 });
  });
});

describe("evidenceFor", () => {
  it("the latest on-topic line from up to 3 people, in chat order, with the words that matched", () => {
    const football = TOPICS.find((t) => t.key === "football")!;
    const ev = evidenceFor(football, seedMessagesFor("sports"));
    expect(ev.map((e) => e.personId)).toEqual(["p-priya", "p-dan", "p-leah"]);
    expect(ev.map((e) => e.keyword)).toEqual(["premier league", "football", "football"]);
  });
});
