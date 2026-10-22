import { describe, expect, it } from "vitest";
import { agentAsking, askAccepted, blocked, booked, halfUnlocked, noPlan } from "../fixtures";
import { chatSourceLabel, effectivePersona, planCell, proposalLine, runSheet, type BeatContext, type StepKey } from "./adminModel";

const ctx: BeatContext = { called: false, callTargetName: null };
const statuses = (state: Parameters<typeof runSheet>[0], c = ctx) => Object.fromEntries(runSheet(state, c).map((b) => [b.key, b.status])) as Record<StepKey, string>;

describe("runSheet", () => {
  it("starts at detect when there is no plan", () => {
    const s = statuses(noPlan);
    expect(s.detect).toBe("current");
    expect(Object.values(s).filter((v) => v === "current")).toHaveLength(1);
    expect(s.book).toBe("upcoming");
  });

  it("walks to the audience beat once the plan, conditions and explanation exist", () => {
    const s = statuses(blocked);
    expect([s.detect, s.extract, s.explain]).toEqual(["done", "done", "done"]);
    expect(s.join).toBe("current");
    expect(s.cascade).toBe("upcoming");
  });

  it("makes an open ask the current beat, ahead of anything else", () => {
    const s = statuses(agentAsking);
    expect(s.answer).toBe("current");
    expect(s.negotiate).toBe("done");
    expect(s.cascade).toBe("upcoming");
  });

  it("marks an answered ask done and moves on to the cascade", () => {
    const s = statuses(askAccepted);
    expect(s.answer).toBe("done");
    expect(s.cascade).toBe("current");
  });

  it("treats a viable plan as done up to the cascade, with booking next", () => {
    const viable = { ...halfUnlocked, plan: { ...halfUnlocked.plan!, status: "viable" as const } };
    const s = statuses(viable);
    expect([s.join, s.negotiate, s.answer, s.cascade]).toEqual(["done", "done", "done", "done"]);
    expect(s.book).toBe("current");
  });

  it("ends on the call, done only once it was rung from this page", () => {
    expect(statuses(booked).call).toBe("current");
    expect(statuses(booked, { called: true, callTargetName: "Bea" }).call).toBe("done");
    expect(runSheet(booked, { called: false, callTargetName: "Bea" }).find((b) => b.key === "call")?.hint).toBe("Rings Bea");
  });

  it("lists every beat once, in demo order", () => {
    expect(runSheet(noPlan, ctx).map((b) => b.key)).toEqual(["detect", "extract", "explain", "join", "negotiate", "answer", "cascade", "book", "call"]);
  });
});

describe("planCell, chatSourceLabel, effectivePersona, proposalLine", () => {
  it("maps plan status to a label and a signal fill", () => {
    expect(planCell(noPlan)).toEqual({ label: "NO PLAN", fill: "off" });
    expect(planCell(blocked)).toEqual({ label: "BLOCKED", fill: "red" });
    expect(planCell(booked)).toEqual({ label: "BOOKED", fill: "green" });
  });

  it("names the chat source without separator characters", () => {
    expect(chatSourceLabel(agentAsking)).toBe("WHATSAPP London Grok builders");
    expect(chatSourceLabel(noPlan)).toBe("SEED");
  });

  it("falls back to the host, then the first person, when the picked persona is gone", () => {
    const withHost = { ...blocked, people: [{ id: "p-host", name: "Host", color: "x", source: "seed" as const }, ...blocked.people] };
    expect(effectivePersona(withHost, "gone")).toBe("p-host");
    expect(effectivePersona(withHost, "p1")).toBe("p1");
    expect(effectivePersona(blocked, "gone")).toBe(blocked.people[0].id);
  });

  it("says what a yes changes", () => {
    expect(proposalLine(agentAsking, agentAsking.asks[0])).toBe("If yes: the venue needs 12+ attendees");
  });
});
