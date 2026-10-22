import { describe, expect, it } from "vitest";
import type { Commitment, Condition } from "@deadlock/shared/types";
import { solve } from "./solver";

function offer(id: string, offers: string, requires: Condition[]): Commitment {
  return { id, personId: id, offers, requires, quote: id, status: "waiting" };
}

describe("blocking chooses sufficient provider paths", () => {
  it("reports the 12-person alternative instead of unioning it with the 15-person venue", () => {
    const result = solve({
      commitments: [
        offer("large", "venue", [{ resource: "attendees", minCount: 15 }]),
        offer("small", "venue", [{ resource: "attendees", minCount: 12 }]),
        offer("speaker", "speaker", [{ resource: "venue" }]),
      ],
      attendeeCount: 11, attendeeTarget: 12,
      requiredForPlan: ["venue", "speaker", "attendees"],
    });
    expect(result.blocking).toEqual([{ resource: "attendees", minCount: 12 }]);
  });

  it("selects one sufficient external root when either provider can supply the venue", () => {
    const result = solve({
      commitments: [
        offer("venue-a", "venue", [{ resource: "laptops", minCount: 4 }]),
        offer("venue-b", "venue", [{ resource: "helpers", minCount: 2 }]),
      ], attendeeCount: 0, counts: { laptops: 3 }, requiredForPlan: ["venue"],
    });
    expect(result.blocking).toEqual([{ resource: "laptops", minCount: 4 }]);
  });

  it("keeps every unmet condition within the selected provider", () => {
    const result = solve({
      commitments: [
        offer("venue-a", "venue", [{ resource: "laptops", minCount: 4 }, { resource: "helpers", minCount: 2 }]),
        offer("venue-b", "venue", [{ resource: "projector" }, { resource: "parking" }, { resource: "food" }]),
      ], attendeeCount: 0, requiredForPlan: ["venue"],
    });
    expect(result.blocking).toEqual([{ resource: "laptops", minCount: 4 }, { resource: "helpers", minCount: 2 }]);
  });

  it("selects shared roots across all required branches instead of choosing each branch greedily", () => {
    const result = solve({
      commitments: [
        offer("venue-a", "venue", [{ resource: "laptops" }]),
        offer("venue-b", "venue", [{ resource: "helpers" }]),
        offer("speaker", "speaker", [{ resource: "helpers", minCount: 2 }]),
      ], attendeeCount: 0, requiredForPlan: ["venue", "speaker"],
    });
    expect(result.blocking).toEqual([{ resource: "helpers", minCount: 2 }]);
  });

  it("combines enough distinct counted providers and preserves the best alternatives", () => {
    const commitments = [
      offer("laptop-a", "laptops", [{ resource: "helpers" }]),
      offer("laptop-b", "laptops", [{ resource: "helpers", minCount: 2 }]),
      offer("laptop-c", "laptops", [{ resource: "attendees", minCount: 20 }]),
      offer("speaker", "speaker", [{ resource: "laptops", minCount: 3 }]),
    ];
    const result = solve({ commitments, attendeeCount: 0, counts: { laptops: 1 }, requiredForPlan: ["speaker"] });
    expect(result.blocking).toEqual([{ resource: "helpers", minCount: 2 }]);
    expect(solve({ commitments, attendeeCount: 0, counts: { laptops: 1, helpers: 2 }, requiredForPlan: ["speaker"] }).viable).toBe(true);
  });

  it("reports additional counted supply when every provider still leaves a shortfall", () => {
    const commitments = [
      offer("laptop", "laptops", [{ resource: "helpers" }]),
      offer("speaker", "speaker", [{ resource: "laptops", minCount: 4 }]),
    ];
    const result = solve({ commitments, attendeeCount: 0, counts: { laptops: 1 }, requiredForPlan: ["speaker"] });
    expect(result.blocking).toEqual([{ resource: "helpers" }, { resource: "laptops", minCount: 3 }]);
    expect(solve({ commitments, attendeeCount: 0, counts: { laptops: 3, helpers: 1 }, requiredForPlan: ["speaker"] }).viable).toBe(true);
  });

  it("prefers an acyclic available path over a cyclic alternative", () => {
    const result = solve({
      commitments: [
        offer("cycle", "venue", [{ resource: "speaker" }]),
        offer("rooted", "venue", [{ resource: "attendees", minCount: 12 }]),
        offer("speaker", "speaker", [{ resource: "venue" }]),
      ], attendeeCount: 11, requiredForPlan: ["speaker"],
    });
    expect(result.blocking).toEqual([{ resource: "attendees", minCount: 12 }]);
  });
});
