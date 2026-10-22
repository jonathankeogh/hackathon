import { describe, expect, it } from "vitest";
import type { Ask } from "../data/v2types";
import { askHeading, firstName, hasAgentActivity, lineOpacity, pickAsk, shownAsks, typedChars, visibleLines } from "./agentLog";

const ask = (id: string, status: Ask["status"]): Ask => ({
  id,
  personId: "p1",
  question: "q",
  proposal: { commitmentId: "c1", requires: [] },
  status,
});

describe("visibleLines", () => {
  it("keeps the newest lines, newest last, with rank from the newest", () => {
    const lines = visibleLines(["a", "b", "c", "d", "e", "f"], 4);
    expect(lines.map((l) => l.text)).toEqual(["c", "d", "e", "f"]);
    expect(lines.map((l) => l.rank)).toEqual([3, 2, 1, 0]);
    expect(lines.map((l) => l.index)).toEqual([2, 3, 4, 5]);
  });
  it("returns everything when the log is short and nothing for an empty log", () => {
    expect(visibleLines(["a", "b"]).map((l) => l.rank)).toEqual([1, 0]);
    expect(visibleLines([])).toEqual([]);
  });
});

describe("lineOpacity", () => {
  it("fades older lines in steps, floored at the oldest step", () => {
    expect([0, 1, 2, 3, 9].map(lineOpacity)).toEqual([1, 0.85, 0.7, 0.6, 0.6]);
  });
});

describe("typedChars", () => {
  it("types one character per step and clamps to the line", () => {
    expect(typedChars(0, 10, 20)).toBe(0);
    expect(typedChars(59, 10, 20)).toBe(2);
    expect(typedChars(5000, 10, 20)).toBe(10);
    expect(typedChars(-5, 10, 20)).toBe(0);
  });
});

describe("pickAsk", () => {
  it("prefers the open ask, else the most recent", () => {
    expect(pickAsk([ask("a", "accepted"), ask("b", "open")])?.id).toBe("b");
    expect(pickAsk([ask("a", "declined"), ask("b", "accepted")])?.id).toBe("b");
  });
  it("is null with none", () => {
    expect(pickAsk(undefined)).toBeNull();
    expect(pickAsk([])).toBeNull();
  });
});

describe("shownAsks", () => {
  it("drops the open ask once the plan is resolved, keeps answered asks, and keeps everything while unresolved", () => {
    const asks = [ask("a", "accepted"), ask("b", "open")];
    expect(shownAsks(asks, true)?.map((a) => a.id)).toEqual(["a"]);
    expect(pickAsk(shownAsks([ask("b", "open")], true))).toBeNull();
    expect(shownAsks(asks, false)).toBe(asks);
  });
});

describe("hasAgentActivity", () => {
  it("is false for a v1 state and true with a log line or an ask", () => {
    expect(hasAgentActivity(undefined, undefined)).toBe(false);
    expect(hasAgentActivity([], [])).toBe(false);
    expect(hasAgentActivity(["x"], undefined)).toBe(true);
    expect(hasAgentActivity([], [ask("a", "open")])).toBe(true);
  });
});

describe("askHeading", () => {
  const text = (s: ReturnType<typeof askHeading>) => s.map((x) => x.text).join(" ");
  it("reads ASKING PRIYA while open, with the name marked for its colour square", () => {
    expect(text(askHeading("open", "Priya"))).toBe("ASKING PRIYA");
    expect(askHeading("open", "Priya").map((x) => x.isName)).toEqual([false, true]);
  });
  it("reads PRIYA SAID YES / NO once answered", () => {
    expect(text(askHeading("accepted", "Priya"))).toBe("PRIYA SAID YES");
    expect(text(askHeading("declined", "Priya"))).toBe("PRIYA SAID NO");
    expect(askHeading("accepted", "Priya").map((x) => x.isName)).toEqual([true, false]);
  });
});

describe("firstName", () => {
  it("takes the first word, with a fallback", () => {
    expect(firstName("Priya Nair")).toBe("Priya");
    expect(firstName(undefined)).toBe("THEM");
  });
});
