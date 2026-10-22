import { describe, expect, it } from "vitest";
import { initialSession, nextSession, sessionEvents } from "./session";
import type { StageEventEnvelope } from "./types";

const cascade = (seq: number): StageEventEnvelope => ({ seq, receivedAt: 0, event: { type: "cascade", order: ["a"] } });

describe("nextSession", () => {
  it("keeps the session while the plan id is unchanged", () => {
    expect(nextSession(initialSession, null, 0)).toBe(initialSession);
    const withPlan = nextSession(initialSession, "plan-1", 0);
    expect(nextSession(withPlan, "plan-1", 3)).toBe(withPlan);
  });
  it("a plan appearing for the first time continues the session (the live flow still animates)", () => {
    expect(nextSession(initialSession, "plan-1", 0)).toEqual({ key: 0, planId: "plan-1", cutoffSeq: 0 });
  });
  it("starts a new session when the plan goes away, cutting off the events so far", () => {
    const live = nextSession(initialSession, "plan-1", 0);
    expect(nextSession(live, null, 4)).toEqual({ key: 1, planId: null, cutoffSeq: 4 });
  });
  it("starts a new session when another plan replaces it", () => {
    const live = nextSession(initialSession, "plan-1", 0);
    expect(nextSession(live, "plan-2", 2)).toEqual({ key: 1, planId: "plan-2", cutoffSeq: 2 });
  });
  it("a new plan after a reset continues that session, then a second reset bumps again", () => {
    const reset = nextSession(nextSession(initialSession, "plan-1", 0), null, 4);
    const second = nextSession(reset, "plan-2", 4);
    expect(second.key).toBe(1);
    expect(nextSession(second, null, 9).key).toBe(2);
  });
});

describe("sessionEvents", () => {
  it("drops events from before the cutoff", () => {
    const all = [cascade(1), cascade(2), cascade(3)];
    expect(sessionEvents(all, 0)).toBe(all);
    expect(sessionEvents(all, 2).map((e) => e.seq)).toEqual([3]);
    expect(sessionEvents(all, 3)).toEqual([]);
  });
});
