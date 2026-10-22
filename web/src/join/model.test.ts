import type { Ask, State, Suggestion } from "@deadlock/shared/types";
import { describe, expect, it } from "vitest";
import { isLineClear, lampFor, openSuggestion, placeFor, rsvpLine, selectScreen, type Saved } from "./model";

const me: Saved = { personId: "ph-1", name: "Ada" };
const ask = { id: "a1", personId: "ph-1", question: "?", proposal: { commitmentId: "c1", requires: [] }, status: "open" } as Ask;

function state(over: Partial<State> = {}): State {
  return {
    people: [
      { id: "p1", name: "P", color: "", source: "seed" },
      { id: "ph-1", name: "Ada", color: "", source: "phone" },
    ],
    messages: [],
    plan: { id: "x", title: "T", status: "blocked", requiredForPlan: [] },
    commitments: [{ id: "c1", personId: "p1", offers: "venue", requires: [{ resource: "attendees", minCount: 15 }], quote: "", status: "waiting" }],
    attendeeCount: 13,
    attendeeTarget: 15,
    blocking: [{ resource: "attendees", minCount: 15 }],
    explanation: "",
    event: null,
    mock: false,
    asks: [],
    agentLog: [],
    ...over,
  };
}
const withPlan = (status: "none" | "blocked" | "viable" | "booked") => state({ plan: { id: "x", title: "T", status, requiredForPlan: [] } });

describe("selectScreen", () => {
  const base = { call: null, me, ask: null, invite: null, state: state() };
  it("joins first, then RSVP, then waits", () => {
    expect(selectScreen({ ...base, me: null })).toBe("join");
    expect(selectScreen(base)).toBe("rsvp");
    expect(selectScreen({ ...base, me: { ...me, role: "help" } })).toBe("waiting");
  });
  it("a call beats everything, even before joining", () => {
    expect(selectScreen({ ...base, me: null, call: "hi" })).toBe("call");
    expect(selectScreen({ ...base, call: "hi", ask, invite: "x" })).toBe("call");
  });
  it("the agent's question beats the line clearing and the invite", () => {
    const joined = { ...me, role: "attend" as const };
    expect(selectScreen({ ...base, me: joined, ask, state: withPlan("viable") })).toBe("ask");
    expect(selectScreen({ ...base, me: joined, ask, invite: "x" })).toBe("ask");
  });
  it("line clear only while viable and not yet invited; the invite then takes over", () => {
    const joined = { ...me, role: "attend" as const };
    expect(selectScreen({ ...base, me: joined, state: withPlan("viable") })).toBe("clear");
    expect(selectScreen({ ...base, me: joined, state: withPlan("viable"), invite: "x" })).toBe("invite");
    expect(selectScreen({ ...base, me: joined, state: withPlan("booked"), invite: "x" })).toBe("invite");
    expect(isLineClear({ me: null, invite: null, state: withPlan("viable") })).toBe(false);
  });
});

describe("plan ideas", () => {
  const suggestion: Suggestion = { id: "s1", topic: "Premier League", people: [], area: null, options: [], status: "open" };
  const joined = { ...me, role: "attend" as const };
  const base = { call: null, me: joined, ask: null, invite: null };
  const noPlan = (over: Partial<Suggestion> = {}) => state({ plan: null, suggestion: { ...suggestion, ...over } });

  it("shows for a joined phone with no plan and an open suggestion", () => {
    expect(selectScreen({ ...base, state: noPlan() })).toBe("suggest");
    expect(openSuggestion(noPlan())?.id).toBe("s1");
  });
  it("RSVP comes first, and the agent's question beats the ideas", () => {
    expect(selectScreen({ ...base, me, state: noPlan() })).toBe("rsvp");
    expect(selectScreen({ ...base, ask, state: noPlan() })).toBe("ask");
  });
  it("is off once picked or dismissed, once there is a plan, or with no suggestion", () => {
    expect(selectScreen({ ...base, state: noPlan({ status: "picked" }) })).toBe("waiting");
    expect(selectScreen({ ...base, state: noPlan({ status: "dismissed" }) })).toBe("waiting");
    expect(selectScreen({ ...base, state: state({ suggestion }) })).toBe("waiting");
    expect(selectScreen({ ...base, state: state({ plan: null }) })).toBe("waiting");
    expect(selectScreen({ ...base, state: null })).toBe("waiting");
  });
});

describe("lampFor", () => {
  it("red blocked, amber waiting, green viable or booked", () => {
    expect(lampFor(withPlan("blocked"), true)).toMatchObject({ lamp: "red", label: "Blocked", blink: false });
    expect(lampFor(withPlan("none"), true).lamp).toBe("amber");
    expect(lampFor(state({ plan: null }), true).lamp).toBe("amber");
    expect(lampFor(withPlan("viable"), true).lamp).toBe("green");
    expect(lampFor(withPlan("booked"), true)).toMatchObject({ lamp: "green", label: "Booked" });
  });
  it("blinks amber while there is no state or the socket is down", () => {
    expect(lampFor(null, false)).toMatchObject({ lamp: "amber", blink: true, label: "Connecting" });
    expect(lampFor(withPlan("blocked"), false)).toMatchObject({ lamp: "amber", blink: true, label: "Reconnecting" });
  });
});

describe("placeFor", () => {
  it("is the seed attendees plus this phone's join order", () => {
    expect(placeFor(state(), "ph-1")).toBe(13);
    const two = state({
      people: [
        { id: "ph-0", name: "B", color: "", source: "phone" },
        { id: "ph-1", name: "Ada", color: "", source: "phone" },
      ],
      attendeeCount: 14,
    });
    expect(placeFor(two, "ph-0")).toBe(13);
    expect(placeFor(two, "ph-1")).toBe(14);
  });
  it("falls back to the count for an unknown phone", () => {
    expect(placeFor(state(), "nobody")).toBe(13);
  });
});

describe("rsvpLine", () => {
  it("names what the missing people unlock", () => {
    expect(rsvpLine(state(), "ph-1")).toBe("You're #13. 2 more to unlock the venue.");
    expect(rsvpLine(state({ attendeeCount: 14 }), "ph-1")).toBe("You're #14. 1 more to unlock the venue.");
  });
  it("says only what is true when head count is not the blocker", () => {
    expect(rsvpLine(state({ blocking: [{ resource: "speaker" }] }), "ph-1")).toBe("You're #13. Something else is holding the plan.");
  });
  it("falls back to the target when nothing waits on a head count", () => {
    expect(rsvpLine(state({ commitments: [] }), "ph-1")).toBe("You're #13. 2 more to reach 15.");
  });
  it("covers a clear line, a booked plan, no plan and no state", () => {
    expect(rsvpLine(withPlan("viable"), "ph-1")).toBe("You're #13. The line is clear.");
    expect(rsvpLine(withPlan("booked"), "ph-1")).toBe("You're #13. It's booked.");
    expect(rsvpLine(withPlan("none"), "ph-1")).toBe("You're #13. Waiting for a plan.");
    expect(rsvpLine(null, "ph-1")).toBe("You're in.");
  });
});
