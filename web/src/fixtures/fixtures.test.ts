import { describe, expect, it } from "vitest";
import type { MessageV2, StateV2 } from "../stage/data/v2types";
import { fixtures } from "./index";
import { PERSON_COLORS } from "./base";

const EMOJI = /\p{Extended_Pictographic}/u;
const DASHES = new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]");

function allText(state: StateV2): string[] {
  return [
    ...state.messages.map((m) => m.text),
    ...state.people.map((p) => p.name),
    ...state.commitments.map((c) => c.quote),
    state.explanation,
    ...(state.agentLog ?? []),
    ...(state.asks ?? []).map((a) => a.question),
    state.chatSource?.label.replace("·", "") ?? "",
    state.plan?.title ?? "",
    ...(state.event ? [state.event.title, state.event.when, state.event.where, state.event.blurb, ...state.event.agenda] : []),
  ];
}

describe.each(fixtures)("fixture $key", ({ state }) => {
  it("is marked mock and has six fixtures in order", () => {
    expect(state.mock).toBe(true);
    expect(fixtures.map((f) => f.key)).toEqual(["noPlan", "blocked", "halfUnlocked", "booked", "agentAsking", "askAccepted"]);
  });

  it("has 10 messages from 6 people, ascending in time with unique ids", () => {
    expect(state.messages).toHaveLength(10);
    expect(state.people).toHaveLength(6);
    expect(new Set(state.messages.map((m) => m.id)).size).toBe(10);
    const ts = state.messages.map((m) => m.ts);
    expect([...ts].sort((a, b) => a - b)).toEqual(ts);
  });

  it("only uses the allowed person colours", () => {
    for (const p of state.people) expect(PERSON_COLORS).toContain(p.color);
  });

  it("references only existing people", () => {
    const ids = new Set(state.people.map((p) => p.id));
    for (const m of state.messages) expect(ids.has(m.personId)).toBe(true);
    for (const c of state.commitments) expect(ids.has(c.personId)).toBe(true);
  });

  it("quotes every commitment verbatim from a message by the same person", () => {
    for (const c of state.commitments) {
      const found = state.messages.some((m) => m.personId === c.personId && m.text.includes(c.quote));
      expect(found, c.quote).toBe(true);
    }
  });

  it("has no emoji and no em or en dashes in copy", () => {
    for (const text of allText(state)) {
      expect(EMOJI.test(text), text).toBe(false);
      expect(DASHES.test(text), text).toBe(false);
    }
  });
});

describe("fixture scenarios", () => {
  const byKey = Object.fromEntries(fixtures.map((f) => [f.key, f.state]));

  it("noPlan has chat only", () => {
    expect(byKey.noPlan?.plan).toBeNull();
    expect(byKey.noPlan?.commitments).toEqual([]);
  });

  it("blocked has everything waiting and attendees blocking", () => {
    const s = byKey.blocked!;
    expect(s.plan?.status).toBe("blocked");
    expect(s.commitments.every((c) => c.status === "waiting")).toBe(true);
    expect(s.attendeeCount).toBe(3);
    expect(s.blocking).toEqual([{ resource: "attendees", minCount: 15 }]);
  });

  it("halfUnlocked has only the venue unlocked", () => {
    const s = byKey.halfUnlocked!;
    expect(s.commitments.filter((c) => c.status === "unlocked").map((c) => c.offers)).toEqual(["venue"]);
    expect(s.attendeeCount).toBeGreaterThanOrEqual(s.attendeeTarget);
  });

  it("booked has everything unlocked and event details", () => {
    const s = byKey.booked!;
    expect(s.plan?.status).toBe("booked");
    expect(s.commitments.every((c) => c.status === "unlocked")).toBe(true);
    expect(s.attendeeCount).toBe(17);
    expect(s.event?.agenda).toHaveLength(4);
  });

  it("requiredForPlan resources are all offered or are attendees", () => {
    const s = byKey.blocked!;
    const offered = new Set(s.commitments.map((c) => c.offers));
    for (const r of s.plan!.requiredForPlan) expect(r === "attendees" || offered.has(r)).toBe(true);
  });

  it("agentAsking is stuck at 12 of 15 with an open ask to Priya about the venue", () => {
    const s = byKey.agentAsking!;
    expect(s.plan?.status).toBe("blocked");
    expect(s.attendeeCount).toBe(12);
    expect(s.blocking).toEqual([{ resource: "attendees", minCount: 15 }]);
    expect(s.agentLog).toHaveLength(3);
    expect(s.chatSource?.kind).toBe("whatsapp");
    expect(s.asks).toHaveLength(1);
    const ask = s.asks![0]!;
    expect(ask).toMatchObject({ personId: "p1", status: "open", proposal: { commitmentId: "c1", requires: [{ resource: "attendees", minCount: 12 }] } });
    expect(s.commitments.find((c) => c.id === "c1")?.requires).toEqual([{ resource: "attendees", minCount: 15 }]);
    expect(s.messages.filter((m) => (m as MessageV2).source === "whatsapp").length).toBeGreaterThan(0);
  });

  it("askAccepted changes only the venue condition to 12+ and logs the yes", () => {
    const before = byKey.agentAsking!;
    const s = byKey.askAccepted!;
    expect(s.asks![0]!.status).toBe("accepted");
    expect(s.commitments.find((c) => c.id === "c1")?.requires).toEqual([{ resource: "attendees", minCount: 12 }]);
    for (const c of s.commitments.filter((x) => x.id !== "c1")) {
      expect(c.requires).toEqual(before.commitments.find((o) => o.id === c.id)?.requires);
    }
    expect(s.agentLog?.at(-1)).toBe("Priya said yes: venue now needs 12+");
    expect(s.agentLog?.slice(0, 3)).toEqual(before.agentLog);
  });

  it("the ask's proposal names a real commitment of the asked person", () => {
    for (const s of [byKey.agentAsking!, byKey.askAccepted!]) {
      const ask = s.asks![0]!;
      const target = s.commitments.find((c) => c.id === ask.proposal.commitmentId);
      expect(target?.personId).toBe(ask.personId);
    }
  });
});
