import { describe, expect, it } from "vitest";
import type { Commitment, Condition } from "@deadlock/shared/types";
import { solve } from "./solver";

let n = 0;
function c(offers: string, requires: Condition[] = [], id = `c${++n}`): Commitment {
  return { id, personId: `p-${id}`, offers, requires, quote: "", status: "waiting" };
}

describe("solve — cases from issue #5", () => {
  it("single commitment with its condition met unlocks and makes the plan viable", () => {
    const r = solve({
      commitments: [c("venue", [{ resource: "attendees", minCount: 3 }], "v")],
      attendeeCount: 5,
      requiredForPlan: ["venue"],
    });
    expect(r.order).toEqual(["v"]);
    expect(r.commitments[0].status).toBe("unlocked");
    expect(r.viable).toBe(true);
    expect(r.blocking).toEqual([]);
  });

  it("chain of 3: attendees → venue → speaker → laptops cascades in causal order", () => {
    const commitments = [
      // Deliberately listed out of order: the solver must still find the chain.
      c("laptops", [{ resource: "speaker" }], "l"),
      c("speaker", [{ resource: "venue" }], "s"),
      c("venue", [{ resource: "attendees", minCount: 15 }], "v"),
    ];
    const blocked = solve({ commitments, attendeeCount: 12, requiredForPlan: ["speaker", "venue", "laptops"] });
    expect(blocked.order).toEqual([]);
    expect(blocked.viable).toBe(false);
    expect(blocked.blocking).toEqual([{ resource: "attendees", minCount: 15 }]);

    const open = solve({ commitments, attendeeCount: 15, requiredForPlan: ["speaker", "venue", "laptops"] });
    expect(open.order).toEqual(["v", "s", "l"]);
    expect(open.viable).toBe(true);
  });

  it("two independent branches both unlock, in input order", () => {
    const r = solve({
      commitments: [
        c("venue", [{ resource: "attendees", minCount: 10 }], "v"),
        c("food", [], "f"),
        c("speaker", [{ resource: "venue" }], "s"),
        c("drinks", [{ resource: "food" }], "d"),
      ],
      attendeeCount: 10,
      requiredForPlan: ["speaker", "drinks"],
    });
    expect(r.order).toEqual(["v", "f", "s", "d"]);
    expect(r.viable).toBe(true);
  });

  it("a commitment that never unlocks (nobody offers what it needs) blocks the plan", () => {
    const r = solve({
      commitments: [c("speaker", [{ resource: "projector" }], "s")],
      attendeeCount: 100,
      requiredForPlan: ["speaker"],
    });
    expect(r.order).toEqual([]);
    expect(r.commitments[0].status).toBe("waiting");
    expect(r.viable).toBe(false);
    expect(r.blocking).toEqual([{ resource: "projector" }]);
  });

  it("threshold exactly met unlocks; one below does not", () => {
    const commitments = [c("venue", [{ resource: "attendees", minCount: 15 }], "v")];
    expect(solve({ commitments, attendeeCount: 15, requiredForPlan: ["venue"] }).viable).toBe(true);
    const below = solve({ commitments, attendeeCount: 14, requiredForPlan: ["venue"] });
    expect(below.viable).toBe(false);
    expect(below.blocking).toEqual([{ resource: "attendees", minCount: 15 }]);
  });
});

describe("solve — edge cases", () => {
  it("no conditions unlocks immediately; empty requiredForPlan is viable", () => {
    const r = solve({ commitments: [c("food", [], "f")], attendeeCount: 0, requiredForPlan: [] });
    expect(r.order).toEqual(["f"]);
    expect(r.viable).toBe(true);
  });

  it("condition without minCount needs at least 1; minCount 0 is always met", () => {
    const r = solve({
      commitments: [c("a", [{ resource: "attendees" }], "a"), c("b", [{ resource: "x", minCount: 0 }], "b")],
      attendeeCount: 0,
      requiredForPlan: [],
    });
    expect(r.order).toEqual(["b"]);
  });

  it("two people offering the same resource: either one is enough", () => {
    const r = solve({
      commitments: [
        c("venue", [{ resource: "attendees", minCount: 50 }], "big"),
        c("venue", [{ resource: "attendees", minCount: 5 }], "small"),
        c("speaker", [{ resource: "venue" }], "s"),
      ],
      attendeeCount: 6,
      requiredForPlan: ["speaker"],
    });
    expect(r.order).toEqual(["small", "s"]);
    expect(r.viable).toBe(true);
    expect(r.commitments.find((x) => x.id === "big")?.status).toBe("waiting");
  });

  it("cycle terminates and still reports what is stuck", () => {
    const r = solve({
      commitments: [c("venue", [{ resource: "speaker" }], "v"), c("speaker", [{ resource: "venue" }], "s")],
      attendeeCount: 20,
      requiredForPlan: ["speaker"],
    });
    expect(r.order).toEqual([]);
    expect(r.viable).toBe(false);
    expect(r.blocking).toEqual(expect.arrayContaining([{ resource: "speaker" }, { resource: "venue" }]));
  });

  it("self-dependency never unlocks", () => {
    const r = solve({ commitments: [c("venue", [{ resource: "venue" }], "v")], attendeeCount: 0, requiredForPlan: ["venue"] });
    expect(r.order).toEqual([]);
    expect(r.blocking).toEqual([{ resource: "venue" }]);
  });

  it("required resource nobody offers is blocking", () => {
    const r = solve({ commitments: [c("venue", [], "v")], attendeeCount: 0, requiredForPlan: ["venue", "food"] });
    expect(r.order).toEqual(["v"]);
    expect(r.viable).toBe(false);
    expect(r.blocking).toEqual([{ resource: "food" }]);
  });

  it("blocking ignores stuck commitments that don't lead to the plan", () => {
    const r = solve({
      commitments: [
        c("venue", [{ resource: "attendees", minCount: 15 }], "v"),
        c("cake", [{ resource: "oven" }], "k"), // stuck, but irrelevant
      ],
      attendeeCount: 12,
      requiredForPlan: ["venue"],
    });
    expect(r.blocking).toEqual([{ resource: "attendees", minCount: 15 }]);
  });

  it("blocking merges per resource and keeps the highest bar", () => {
    const r = solve({
      commitments: [
        c("venue", [{ resource: "attendees", minCount: 10 }], "v"),
        c("speaker", [{ resource: "attendees", minCount: 15 }, { resource: "venue" }], "s"),
      ],
      attendeeCount: 3,
      requiredForPlan: ["speaker"],
    });
    expect(r.blocking).toEqual([{ resource: "attendees", minCount: 15 }]);
  });

  it("attendeeTarget sets the plan-level bar for attendees", () => {
    const base = { commitments: [], requiredForPlan: ["attendees"], attendeeTarget: 15 };
    expect(solve({ ...base, attendeeCount: 14 }).blocking).toEqual([{ resource: "attendees", minCount: 15 }]);
    expect(solve({ ...base, attendeeCount: 15 }).viable).toBe(true);
  });

  it("counts feed other counted resources, e.g. laptops from RSVPs", () => {
    const commitments = [c("speaker", [{ resource: "laptops", minCount: 4 }], "s")];
    expect(solve({ commitments, attendeeCount: 0, counts: { laptops: 3 }, requiredForPlan: ["speaker"] }).viable).toBe(false);
    expect(solve({ commitments, attendeeCount: 0, counts: { laptops: 4 }, requiredForPlan: ["speaker"] }).viable).toBe(true);
  });

  it("resource keys from the LLM are normalised (case, whitespace)", () => {
    const r = solve({
      commitments: [c(" Venue", [{ resource: "Attendees ", minCount: 2 }], "v"), c("speaker", [{ resource: "VENUE" }], "s")],
      attendeeCount: 2,
      requiredForPlan: ["Speaker"],
    });
    expect(r.order).toEqual(["v", "s"]);
    expect(r.viable).toBe(true);
  });

  it("does not mutate its input and returns original fields with status set", () => {
    const input = [c(" Venue", [], "v")];
    const snapshot = structuredClone(input);
    const r = solve({ commitments: input, attendeeCount: 0, requiredForPlan: ["venue"] });
    expect(input).toEqual(snapshot);
    expect(r.commitments[0]).toEqual({ ...snapshot[0], status: "unlocked" });
  });

  it("re-solving with a previous result's statuses gives the same answer", () => {
    const commitments = [c("venue", [{ resource: "attendees", minCount: 15 }], "v"), c("speaker", [{ resource: "venue" }], "s")];
    const first = solve({ commitments, attendeeCount: 15, requiredForPlan: ["speaker"] });
    const again = solve({ commitments: first.commitments, attendeeCount: 15, requiredForPlan: ["speaker"] });
    expect(again.order).toEqual(first.order);
  });
});
