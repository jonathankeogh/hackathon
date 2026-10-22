import type { Plan, State } from "@deadlock/shared/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CascadeSequencer, NET_MARGIN_MS, PLAN_DELAY_MS, REVEAL_GAP_MS, type CascadeSnapshot } from "./sequencer";

type Status = "waiting" | "unlocked";

function mk(statuses: Record<string, Status>, plan: Plan["status"] = "blocked"): State {
  return {
    people: [],
    messages: [],
    plan: { id: "p", title: "T", status: plan, requiredForPlan: [] },
    commitments: Object.entries(statuses).map(([id, status]) => ({
      id,
      personId: "x",
      offers: "venue",
      requires: [],
      quote: "",
      status,
    })),
    attendeeCount: 0,
    attendeeTarget: 15,
    blocking: [],
    explanation: "",
    event: null,
    mock: false,
    asks: [],
    agentLog: [],
  } as State;
}

function setup(initial: State) {
  const snaps: CascadeSnapshot[] = [];
  const onReveal = vi.fn();
  const onPlanLit = vi.fn();
  const seq = new CascadeSequencer(initial, (s) => snaps.push(s), { onReveal, onPlanLit });
  const last = () => snaps[snaps.length - 1] ?? seq.snapshot();
  return { seq, snaps, last, onReveal, onPlanLit };
}

const ALL_WAIT = { a: "waiting", b: "waiting", c: "waiting" } as const;
const ALL_GO = { a: "unlocked", b: "unlocked", c: "unlocked" } as const;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("CascadeSequencer", () => {
  it("shows the first state as-is with no animation", () => {
    const { seq, snaps } = setup(mk({ a: "unlocked", b: "waiting" }, "viable"));
    const s = seq.snapshot();
    expect(s.displayedStatus).toEqual({ a: "unlocked", b: "waiting" });
    expect(s.planLit).toBe(true);
    expect(s.flashing.size).toBe(0);
    expect(snaps).toHaveLength(0);
  });

  it("never shows a fresh unlock instantly, reveals 400ms apart, then lights the plan", () => {
    const { seq, last, onReveal, onPlanLit } = setup(mk(ALL_WAIT));
    seq.update(mk(ALL_GO, "viable"));
    expect(last().displayedStatus).toEqual(ALL_WAIT);
    vi.advanceTimersByTime(149);
    expect(last().displayedStatus.a).toBe("waiting");
    vi.advanceTimersByTime(1);
    expect(last().displayedStatus).toEqual({ a: "unlocked", b: "waiting", c: "waiting" });
    expect([...last().flashing]).toEqual(["a"]);
    vi.advanceTimersByTime(250);
    expect(last().flashing.size).toBe(0);
    vi.advanceTimersByTime(150);
    expect(last().displayedStatus.b).toBe("unlocked");
    vi.advanceTimersByTime(400);
    expect(last().displayedStatus.c).toBe("unlocked");
    expect(last().planLit).toBe(false);
    vi.advanceTimersByTime(399);
    expect(last().planLit).toBe(false);
    vi.advanceTimersByTime(1);
    expect(last().planLit).toBe(true);
    expect(onReveal.mock.calls.map((c) => c[0])).toEqual(["a", "b", "c"]);
    expect(onPlanLit).toHaveBeenCalledTimes(1);
  });

  it("uses a cascade order that arrived before the state, without waiting", () => {
    const { seq, last, onReveal } = setup(mk(ALL_WAIT));
    seq.setOrder(["c", "a", "b"]);
    seq.update(mk(ALL_GO, "viable"));
    expect(last().displayedStatus.c).toBe("unlocked");
    vi.advanceTimersByTime(800);
    expect(onReveal.mock.calls.map((c) => c[0])).toEqual(["c", "a", "b"]);
  });

  it("starts as soon as a cascade order arrives within the 150ms window", () => {
    const { seq, last, onReveal } = setup(mk(ALL_WAIT));
    seq.update(mk(ALL_GO, "viable"));
    vi.advanceTimersByTime(60);
    seq.setOrder(["b", "c", "a"]);
    expect(last().displayedStatus.b).toBe("unlocked");
    vi.advanceTimersByTime(800);
    expect(onReveal.mock.calls.map((c) => c[0])).toEqual(["b", "c", "a"]);
  });

  it("applies a reset immediately and clears the queue", () => {
    const { seq, last, onReveal } = setup(mk(ALL_WAIT));
    seq.update(mk(ALL_GO, "viable"));
    vi.advanceTimersByTime(150);
    seq.update(mk(ALL_WAIT, "blocked"));
    expect(last().displayedStatus).toEqual(ALL_WAIT);
    expect(last().flashing.size).toBe(0);
    expect(last().planLit).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(last().displayedStatus).toEqual(ALL_WAIT);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("treats disappearing ids as a reset", () => {
    const { seq, last } = setup(mk({ a: "unlocked", b: "unlocked" }, "viable"));
    seq.update(mk({}, "none"));
    expect(last().displayedStatus).toEqual({});
    expect(last().planLit).toBe(false);
  });

  it("follows the plan directly when nothing is queued", () => {
    const { seq, last } = setup(mk(ALL_GO, "blocked"));
    seq.update(mk(ALL_GO, "booked"));
    expect(last().planLit).toBe(true);
  });

  it("appends unlocks that arrive mid-run", () => {
    const { seq, onReveal } = setup(mk(ALL_WAIT));
    seq.update(mk({ a: "unlocked", b: "waiting", c: "waiting" }));
    vi.advanceTimersByTime(150);
    seq.update(mk({ a: "unlocked", b: "unlocked", c: "waiting" }));
    vi.advanceTimersByTime(400);
    expect(onReveal.mock.calls.map((c) => c[0])).toEqual(["a", "b"]);
  });

  it("reveals a server-dripped unlock right away when 400ms have passed since the last one", () => {
    const { seq, last } = setup(mk(ALL_WAIT));
    seq.setOrder(["a", "b", "c"]);
    seq.update(mk({ a: "unlocked", b: "waiting", c: "waiting" }));
    expect(last().displayedStatus.a).toBe("unlocked");
    vi.advanceTimersByTime(400);
    seq.update(mk({ a: "unlocked", b: "unlocked", c: "waiting" }));
    vi.advanceTimersByTime(1);
    expect(last().displayedStatus.b).toBe("unlocked");
    vi.advanceTimersByTime(399);
    seq.update(mk(ALL_GO, "viable"));
    vi.advanceTimersByTime(1);
    expect(last().displayedStatus.c).toBe("unlocked");
    expect(last().planLit).toBe(false);
    vi.advanceTimersByTime(400);
    expect(last().planLit).toBe(true);
  });

  it("settle-net: if the reveal timer is lost, every lamp still shows the server status and the plan lamp lights", () => {
    const { seq, last, onPlanLit } = setup(mk(ALL_WAIT));
    seq.update(mk(ALL_GO, "viable"));
    vi.advanceTimersByTime(100);
    // A dropped frame or a throttled tab: the pending reveal never fires.
    clearTimeout((seq as unknown as { timer: ReturnType<typeof setTimeout> }).timer);
    vi.advanceTimersByTime(600);
    expect(last().planLit).toBe(false);
    vi.advanceTimersByTime(NET_MARGIN_MS + 4 * REVEAL_GAP_MS + PLAN_DELAY_MS);
    expect(last().displayedStatus).toEqual(ALL_GO);
    expect(last().flashing.size).toBe(0);
    expect(last().planLit).toBe(true);
    expect(onPlanLit).toHaveBeenCalledTimes(1);
  });

  it("settle-net: does nothing when the cascade finished normally", () => {
    const { seq, snaps, onPlanLit } = setup(mk(ALL_WAIT));
    seq.update(mk(ALL_GO, "viable"));
    vi.advanceTimersByTime(3000);
    const settledCount = snaps.length;
    vi.advanceTimersByTime(NET_MARGIN_MS + 10_000);
    expect(snaps.length).toBe(settledCount);
    expect(onPlanLit).toHaveBeenCalledTimes(1);
  });

  it("stops all timers on dispose", () => {
    const { seq, onReveal } = setup(mk(ALL_WAIT));
    seq.update(mk(ALL_GO, "viable"));
    seq.dispose();
    vi.advanceTimersByTime(5000);
    expect(onReveal).not.toHaveBeenCalled();
  });
});
