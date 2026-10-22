import { describe, expect, it } from "vitest";
import { CHAT } from "./content";
import { agentLine, BEATS, beatAt, calloutAt, clamp01, CONNECTORS, COUNT_TARGET, quantise, scrollProgress, seg, storyAt, T } from "./storyMap";

describe("seg and clamp", () => {
  it("clamps and maps a window to 0..1", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(seg(0.5, 0.4, 0.6)).toBeCloseTo(0.5);
    expect(seg(0.1, 0.4, 0.6)).toBe(0);
    expect(seg(0.9, 0.4, 0.6)).toBe(1);
    expect(seg(0.5, 0.5, 0.5)).toBe(1);
  });
});

describe("scrollProgress", () => {
  it("is 0 before the pin, 1 at the end, and linear between", () => {
    // section 5000 tall, viewport 900, nav 64: the pinned panel is 836 tall, range 4164
    expect(scrollProgress(200, 5000, 900, 64)).toBe(0);
    expect(scrollProgress(64, 5000, 900, 64)).toBe(0);
    expect(scrollProgress(64 - 2082, 5000, 900, 64)).toBeCloseTo(0.5);
    expect(scrollProgress(-9000, 5000, 900, 64)).toBe(1);
  });

  it("is 0 when the section is not taller than the viewport", () => {
    expect(scrollProgress(0, 500, 900, 64)).toBe(0);
  });

  it("quantises so a frame only re-renders on a real change", () => {
    expect(quantise(0.50001)).toBe(quantise(0.50002));
    expect(quantise(7)).toBe(1);
    expect(quantise(-1)).toBe(0);
  });
});

describe("storyAt", () => {
  it("starts empty with the plan blocked", () => {
    const s = storyAt(0);
    expect(s.beat).toBe("chat");
    expect(s.messages.every((m) => m.appear === 0)).toBe(true);
    expect(Object.values(s.nodes).every((n) => n.appear === 0)).toBe(true);
    expect(s.attendees).toBe(0);
    expect(s.booked).toBe(false);
  });

  it("clamps out-of-range progress", () => {
    expect(storyAt(-3).p).toBe(0);
    expect(storyAt(9).p).toBe(1);
  });

  it("brings the chat in, in order, and extracts the signals one by one", () => {
    const s = storyAt(0.13);
    expect(s.messages.find((m) => m.id === "sam")!.appear).toBe(1);
    expect(s.messages.find((m) => m.id === "priya")!.appear).toBe(1);
    expect(s.messages.find((m) => m.id === "dev")!.appear).toBe(0);
    expect(s.nodes.plan.appear).toBe(1);
    expect(s.nodes.plan.lamp).toBe("red");
    expect(s.nodes.venue.appear).toBeGreaterThan(0);
    expect(s.nodes.speaker.appear).toBe(0);
    expect(s.beat).toBe("conditions");
  });

  it("climbs the counter to 12 and stops there while the venue goes red", () => {
    expect(storyAt(0.33).attendees).toBe(0);
    const mid = storyAt(0.42).attendees;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(COUNT_TARGET);
    const stalled = storyAt(0.55);
    expect(stalled.attendees).toBe(COUNT_TARGET);
    expect(stalled.beat).toBe("stall");
    expect(stalled.nodes.venue.lamp).toBe("red");
    expect(stalled.stuckSeconds).toBeGreaterThan(0);
    expect(storyAt(0.6).stuckSeconds).toBe(8);
    expect(stalled.venueMin).toBe(15);
  });

  it("types the agent question out, then Priya says yes and 15 becomes 12", () => {
    const early = storyAt(0.64).messages.find((m) => m.id === "ask")!;
    const full = CHAT.find((m) => m.id === "ask")!.text;
    expect(early.text.length).toBeGreaterThan(0);
    expect(early.text.length).toBeLessThan(full.length);
    expect(storyAt(0.73).messages.find((m) => m.id === "ask")!.text).toBe(full);
    expect(storyAt(0.77).messages.find((m) => m.id === "reply")!.appear).toBeGreaterThan(0);
    expect(storyAt(0.77).venueMin).toBe(15);
    const after = storyAt(T.loosen);
    expect(after.loosened).toBe(true);
    expect(after.venueMin).toBe(12);
    expect(after.nodes.venue.lamp).toBe("amber");
  });

  it("cascades green link by link in track order and ends booked", () => {
    const greenAt = (p: number) => Object.entries(storyAt(p).nodes).filter(([, n]) => n.lamp === "green").map(([id]) => id);
    expect(greenAt(0.79)).toEqual([]);
    expect(greenAt(0.82)).toEqual(["attendees"]);
    expect(greenAt(0.85)).toEqual(["attendees", "venue"]);
    expect(greenAt(0.89)).toEqual(["attendees", "venue", "speaker"]);
    expect(greenAt(0.92)).toEqual(["attendees", "venue", "speaker", "laptops"]);
    expect(greenAt(0.94)).toContain("plan");
    const end = storyAt(1);
    expect(end.booked).toBe(true);
    expect(end.beat).toBe("booked");
    expect(Object.values(end.nodes).every((n) => n.lamp === "green" && n.appear === 1)).toBe(true);
    expect(end.connectors.every((c) => c.power === 1 && c.appear === 1)).toBe(true);
    expect(end.messages.every((m) => m.appear === 1)).toBe(true);
  });

  it("powers a connector only after its source turns green", () => {
    for (const c of CONNECTORS) {
      const before = storyAt(T.green[c.from] - 0.001).connectors.find((x) => x.id === c.id)!;
      expect(before.power).toBe(0);
      const after = storyAt(T.green[c.from] + 0.04).connectors.find((x) => x.id === c.id)!;
      expect(after.power).toBe(1);
    }
  });

  it("tags the venue as the bottleneck, then as being asked, then clears the tag", () => {
    expect(calloutAt(0.4)).toBeNull();
    expect(calloutAt(0.55)).toEqual({ label: "BOTTLENECK", tone: "blocked" });
    expect(calloutAt(0.7)).toEqual({ label: "ASKING PRIYA", tone: "waiting" });
    expect(calloutAt(0.8)).toBeNull();
  });

  it("runs the train out of the station only after the plan is green", () => {
    expect(storyAt(0.94).train).toBe(0);
    expect(storyAt(0.975).train).toBeGreaterThan(0);
    expect(storyAt(0.975).train).toBeLessThan(1);
    expect(storyAt(1).train).toBe(1);
    expect(storyAt(0.9).exit).toBe(0);
    expect(storyAt(1).exit).toBe(1);
  });

  it("is a pure function of p: the same p gives the same story, forwards or back", () => {
    storyAt(0.9);
    expect(storyAt(0.5)).toEqual(storyAt(0.5));
  });

  it("orders the beats and finds the current one", () => {
    expect(BEATS.map((b) => b.at)).toEqual([...BEATS.map((b) => b.at)].sort((a, b) => a - b));
    expect(beatAt(0).beat).toBe("chat");
    expect(beatAt(0.7).beat).toBe("ask");
    expect(beatAt(0.99).beatIndex).toBe(BEATS.length - 1);
  });

  it("says something for every moment, never an empty line", () => {
    for (let i = 0; i <= 100; i += 1) {
      const line = agentLine(storyAt(i / 100));
      expect(line.label.length).toBeGreaterThan(0);
      expect(line.text.length).toBeGreaterThan(0);
    }
    expect(agentLine(storyAt(0.55)).label).toBe("Stuck 4s");
  });
});
