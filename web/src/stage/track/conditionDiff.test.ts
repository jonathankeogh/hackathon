import { describe, expect, it } from "vitest";
import type { Commitment, Condition } from "@deadlock/shared/types";
import { agentAsking, askAccepted } from "../../fixtures";
import type { Ask } from "../data/v2types";
import { changedCondition, formatCondition, nextHistory, type RequiresHistory } from "./conditionDiff";

const at = (n: number): Condition[] => [{ resource: "attendees", minCount: n }];
const commit = (id: string, requires: Condition[]): Commitment => ({
  id,
  personId: "p1",
  offers: "venue",
  requires,
  quote: "q",
  status: "waiting",
});
const accepted: Ask = { id: "a1", personId: "p1", question: "q", proposal: { commitmentId: "c1", requires: at(12) }, status: "accepted" };

describe("formatCondition", () => {
  it("shows a count as N+ and a bare resource by name", () => {
    expect(formatCondition({ resource: "attendees", minCount: 15 })).toBe("15+");
    expect(formatCondition({ resource: "venue" })).toBe("venue");
  });
});

describe("nextHistory", () => {
  const empty: RequiresHistory = new Map();

  it("remembers a new commitment with no previous condition", () => {
    const h = nextHistory(empty, [commit("c1", at(15))]);
    expect(h.get("c1")).toEqual({ current: at(15), previous: null });
  });

  it("returns the same history object when nothing changed", () => {
    const h = nextHistory(empty, [commit("c1", at(15))]);
    expect(nextHistory(h, [commit("c1", at(15))])).toBe(h);
  });

  it("moves the old requires to previous when they change", () => {
    const h = nextHistory(nextHistory(empty, [commit("c1", at(15))]), [commit("c1", at(12))]);
    expect(h.get("c1")).toEqual({ current: at(12), previous: at(15) });
  });

  it("keeps the first previous across an unrelated re-render, and drops removed commitments", () => {
    const changed = nextHistory(nextHistory(empty, [commit("c1", at(15)), commit("c2", [])]), [commit("c1", at(12)), commit("c2", [])]);
    expect(nextHistory(changed, [commit("c1", at(12)), commit("c2", [])]).get("c1")?.previous).toEqual(at(15));
    expect(nextHistory(changed, [commit("c1", at(12))]).has("c2")).toBe(false);
  });
});

describe("changedCondition", () => {
  const history = (previous: Condition[] | null, current: Condition[]): RequiresHistory => new Map([["c1", { current, previous }]]);

  it("shows old 15+ and new 12+ for an accepted ask whose proposal has applied", () => {
    expect(changedCondition(history(at(15), at(12)), [accepted], "c1")).toEqual({ resource: "attendees", from: "15+", to: "12+" });
  });

  it("shows nothing when the stage never saw the old condition", () => {
    expect(changedCondition(history(null, at(12)), [accepted], "c1")).toBeNull();
    expect(changedCondition(new Map(), [accepted], "c1")).toBeNull();
  });

  it("shows nothing while the ask is open or declined", () => {
    expect(changedCondition(history(at(15), at(12)), [{ ...accepted, status: "open" }], "c1")).toBeNull();
    expect(changedCondition(history(at(15), at(12)), [{ ...accepted, status: "declined" }], "c1")).toBeNull();
  });

  it("shows nothing until the commitment's requires equal the proposal", () => {
    expect(changedCondition(history(at(14), at(15)), [accepted], "c1")).toBeNull();
  });

  it("shows nothing for a commitment the ask does not name, or with no asks", () => {
    expect(changedCondition(history(at(15), at(12)), [accepted], "c2")).toBeNull();
    expect(changedCondition(history(at(15), at(12)), undefined, "c1")).toBeNull();
  });

  it("follows the fixtures: agentAsking then askAccepted", () => {
    const seen = nextHistory(new Map(), agentAsking.commitments);
    const after = nextHistory(seen, askAccepted.commitments);
    expect(changedCondition(after, askAccepted.asks, "c1")).toEqual({ resource: "attendees", from: "15+", to: "12+" });
    expect(changedCondition(after, askAccepted.asks, "c2")).toBeNull();
    expect(changedCondition(seen, agentAsking.asks, "c1")).toBeNull();
  });
});
