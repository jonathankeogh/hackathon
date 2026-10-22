import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentAsking } from "../fixtures";
import { AdminPanel } from "./AdminPanel";
import { readAdminMock } from "./devMock";
import { PENDING_MS } from "./useAdminActions";
import type { AdminConnection } from "./useAdminConnection";

/**
 * Every admin event the old AdminPage emitted (read from the file before it was replaced):
 * admin:step for detect, extract, explain, cascade, book, call, negotiate, tips; admin:answer
 * (yes and no); admin:simulateJoins; chat:send; admin:callTarget; admin:jobs;
 * admin:simulateChange; admin:mock; admin:seed; admin:reset.
 */
const OLD_EVENTS = [
  ["admin:step", { step: "detect" }],
  ["admin:step", { step: "extract" }],
  ["admin:step", { step: "explain" }],
  ["admin:step", { step: "cascade" }],
  ["admin:step", { step: "book" }],
  ["admin:step", { step: "call" }],
  ["admin:step", { step: "negotiate" }],
  ["admin:step", { step: "tips" }],
  ["admin:answer", { accept: true }],
  ["admin:answer", { accept: false }],
  ["admin:simulateJoins", { count: 1 }],
  ["admin:simulateJoins", { count: 3 }],
  ["admin:simulateJoins", { count: 20 }],
  ["chat:send", { personId: "p-host", text: "hello" }],
  ["admin:callTarget", { personId: "ph1" }],
  ["admin:jobs", { weather: false }],
  ["admin:jobs", { travel: false }],
  ["admin:simulateChange", { kind: "weather" }],
  ["admin:simulateChange", { kind: "travel" }],
  ["admin:mock", { on: false }],
  ["admin:seed", undefined],
  ["admin:reset", undefined],
  // Added on master after the rebuild: plan ideas.
  ["admin:step", { step: "suggest" }],
  ["admin:pick", { option: "live" }],
  ["admin:pick", { option: "venue" }],
  ["admin:pick", { option: "area" }],
  ["admin:seed", { scenario: "sports" }],
] as const;

const conn = (over: Partial<AdminConnection> = {}): AdminConnection => ({
  state: {
    ...agentAsking,
    mock: true,
    jobs: { weather: true, travel: true },
    people: [{ id: "p-host", name: "Host", color: "x", source: "seed" }, { id: "ph1", name: "Alex", color: "x", source: "phone" }, ...agentAsking.people],
  },
  connected: true,
  denied: false,
  locked: false,
  callTarget: null,
  announced: null,
  ...over,
});

const emit = vi.fn();
const tap = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const settle = () => act(() => void vi.advanceTimersByTime(PENDING_MS + 50));

beforeEach(() => {
  vi.useFakeTimers();
  emit.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AdminPanel", () => {
  it("still emits every admin event the old page emitted, with the same payloads", () => {
    const { unmount } = render(<AdminPanel conn={conn()} emit={emit} />);
    for (const name of ["Detect the plan", "Extract the conditions", "Explain why it is stuck", "Ask the bottleneck", "Cascade to viable", "Book it", "Ring the call target"]) {
      tap(new RegExp(name));
    }
    tap("Accept");
    settle();
    tap("Decline");
    for (const n of ["+1", "+3", "+20"]) tap(n);

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "hello" } });
    tap("Send");

    (document.querySelector("details") as HTMLDetailsElement).open = true;
    fireEvent.change(screen.getByTestId("call-target"), { target: { value: "ph1" } });
    tap("weather on");
    settle();
    tap("travel on");
    tap("weather change");
    tap("travel change");
    tap("Re-read tips and nearby");
    tap(/Offer 3 plans/);
    for (const n of [1, 2, 3]) tap(`Pick ${n}`);
    settle();
    tap("Seed sports chat");
    tap("Tap again to seed sports");
    tap(/Mock is on/);
    tap("Re-seed chat");
    tap("Tap again to re-seed");
    tap("Reset demo");
    tap("Tap again to reset");

    const sent = emit.mock.calls.map(([event, payload]) => JSON.stringify([event, payload]));
    for (const [event, payload] of OLD_EVENTS) expect(sent).toContain(JSON.stringify([event, payload]));
    unmount();
  });

  it("shows the plan ideas in the run sheet while a suggestion exists, and picks from them", () => {
    const base = conn();
    const suggestion = {
      id: "sg1",
      topic: "Premier League",
      people: ["a", "b", "c"],
      area: null,
      status: "open" as const,
      options: [
        { id: "live" as const, title: "Arsenal v Spurs", detail: "Sat", plan: "Watch", votes: ["a", "b"] },
        { id: "venue" as const, title: "Five-a-side", detail: "Sun", plan: "Play", votes: [] },
        { id: "area" as const, title: "Sports bar", detail: "Fri", plan: "Bar", votes: ["c"] },
      ],
    };
    render(<AdminPanel conn={{ ...base, state: { ...base.state!, suggestion } }} emit={emit} />);
    const ideas = screen.getByTestId("plan-ideas");
    expect(ideas.textContent).toContain("Premier League");
    expect(ideas.textContent).toContain("Arsenal v Spurs, 2 votes");
    expect(ideas.textContent).toContain("Five-a-side, 0 votes");
    expect(screen.getAllByRole("button", { name: /^Pick \d/ })).toHaveLength(3);
    tap(/Pick 2/);
    expect(emit).toHaveBeenCalledWith("admin:pick", { option: "venue" });
  });

  it("previews a suggestion with ?mock=ideas", () => {
    const mock = readAdminMock("?mock=ideas", true)!;
    expect(mock.state?.suggestion?.options).toHaveLength(3);
    render(<AdminPanel conn={mock} emit={emit} preview />);
    expect(screen.getByTestId("plan-ideas").textContent).toContain("Premier League");
  });

  it("keeps the pick buttons in Settings when no suggestion exists", () => {
    render(<AdminPanel conn={conn()} emit={emit} />);
    expect(screen.queryByTestId("plan-ideas")).toBeNull();
    expect(screen.getByText(/None yet/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Pick \d/ })).toHaveLength(3);
  });

  it("does not seed the sports chat on one tap: the first tap only arms it", () => {
    render(<AdminPanel conn={conn()} emit={emit} />);
    tap("Seed sports chat");
    expect(emit).not.toHaveBeenCalledWith("admin:seed", { scenario: "sports" });
  });

  it("does not reset on one tap: the first tap only arms it", () => {
    render(<AdminPanel conn={conn()} emit={emit} />);
    (document.querySelector("details") as HTMLDetailsElement).open = true;
    tap("Reset demo");
    expect(emit).not.toHaveBeenCalledWith("admin:reset", undefined);
    act(() => void vi.advanceTimersByTime(5000));
    expect(screen.getByRole("button", { name: "Reset demo" })).toBeTruthy();
  });

  it("sends nothing and says so while the socket is down", () => {
    render(<AdminPanel conn={conn({ connected: false })} emit={emit} />);
    tap(/Detect the plan/);
    expect(emit).not.toHaveBeenCalled();
    expect(screen.getByText(/Buttons are paused/)).toBeTruthy();
  });

  it("sends nothing in a preview, and labels the toast", () => {
    render(<AdminPanel conn={conn()} emit={emit} preview />);
    tap("Accept");
    expect(screen.getByTestId("admin-toast").textContent).toContain("Preview, not sent");
  });

  it("shows the open ask only while one is open", () => {
    const { rerender } = render(<AdminPanel conn={conn()} emit={emit} />);
    expect(screen.getByTestId("open-ask")).toBeTruthy();
    const base = conn();
    rerender(<AdminPanel conn={{ ...base, state: { ...base.state!, asks: [] } }} emit={emit} />);
    expect(screen.queryByTestId("open-ask")).toBeNull();
  });

  it("flags a denied key", () => {
    render(<AdminPanel conn={conn({ denied: true, locked: true })} emit={emit} />);
    expect(screen.getAllByText(/ADMIN_KEY/).length).toBeGreaterThan(0);
  });
});
