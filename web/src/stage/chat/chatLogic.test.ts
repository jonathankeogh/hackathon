import { describe, expect, it } from "vitest";
import { blocked } from "../../fixtures";
import { chatHeading, commitmentsForMessage, firstFittingIndex, rowOpacity, staggerDelays } from "./chatLogic";

describe("commitmentsForMessage", () => {
  it("finds the commitment whose quote sits inside the message", () => {
    const m5 = blocked.messages.find((m) => m.id === "m5")!;
    expect(commitmentsForMessage(m5, blocked.commitments).map((c) => c.id)).toEqual(["c1"]);
  });
  it("returns nothing for chatter", () => {
    const m1 = blocked.messages.find((m) => m.id === "m1")!;
    expect(commitmentsForMessage(m1, blocked.commitments)).toEqual([]);
  });
  it("returns nothing when there are no commitments", () => {
    expect(commitmentsForMessage(blocked.messages[0]!, [])).toEqual([]);
  });
});

describe("rowOpacity", () => {
  it("is 1 for the newest and decreases, never below 60% (anything shown is meant to be read)", () => {
    expect(rowOpacity(0)).toBe(1);
    expect(rowOpacity(3)).toBeLessThan(rowOpacity(2));
    expect(rowOpacity(4)).toBeCloseTo(0.6);
    expect(rowOpacity(50)).toBe(0.6);
  });
});

describe("staggerDelays", () => {
  it("staggers only unseen ids in order", () => {
    const d = staggerDelays(["a", "b", "c", "d"], new Set(["a", "c"]), 0.12);
    expect([...d.entries()]).toEqual([["b", 0], ["d", 0.12]]);
  });
});

describe("firstFittingIndex", () => {
  it("keeps everything when it all fits", () => {
    expect(firstFittingIndex([100, 100, 100], 10, 400)).toBe(0);
  });
  it("hides the oldest rows that would be cut", () => {
    expect(firstFittingIndex([100, 100, 100], 10, 250)).toBe(1);
    expect(firstFittingIndex([100, 100, 100], 10, 210)).toBe(1);
    expect(firstFittingIndex([100, 100, 100], 10, 209)).toBe(2);
  });
  it("hides all rows when even the newest does not fit", () => {
    expect(firstFittingIndex([100], 10, 50)).toBe(1);
  });
  it("handles an empty list", () => {
    expect(firstFittingIndex([], 10, 50)).toBe(0);
  });
});

describe("chatHeading", () => {
  it("uses the chat source label when there is one", () => {
    expect(chatHeading("WHATSAPP, London Grok builders")).toBe("WHATSAPP, London Grok builders");
  });
  it("replaces the separator dot in the label", () => {
    expect(chatHeading("WHATSAPP \u00b7 London Grok builders")).toBe("WHATSAPP: London Grok builders");
  });
  it("falls back to the seeded heading for a missing or blank label", () => {
    expect(chatHeading(undefined)).toBe("LONDON BUILDERS");
    expect(chatHeading("  ")).toBe("LONDON BUILDERS");
  });
});
