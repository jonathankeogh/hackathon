import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentAsking, blocked, booked, noPlan } from "../../fixtures";
import type { StageData } from "../data/types";
import type { StateV2 } from "../data/v2types";
import { initialSnapshot } from "../cascade/sequencer";
import { COLLAPSED_MESSAGES, visibleMessages } from "./PhoneChat";
import { PhoneLayout } from "./PhoneLayout";
import { rowCharsFor } from "./PhoneEventBoard";

let current: StageData;
vi.mock("../data/useStageData", () => ({ useStageData: () => current }));
import { StageApp } from "../StageApp";

const data = (state: StateV2): StageData => ({ ready: true, state, events: [], streaming: null });

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: height });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setViewport(1024, 768);
});

const layout = (state: StateV2) => render(<PhoneLayout state={state} cascade={initialSnapshot(state)} streaming={null} />);
const top = (el: HTMLElement) => Array.from(document.body.querySelectorAll("*")).indexOf(el);

describe("PhoneLayout", () => {
  it("stacks header, track, agent, why, counter with a Join button, then the chat", () => {
    layout(agentAsking);
    const order = ["phone-header", "phone-track", "agent-panel", "phone-join", "phone-chat"].map((id) => top(screen.getByTestId(id)));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // "Why it's stuck" sits between the agent and the counter.
    const why = top(screen.getByText("WHY IT'S STUCK"));
    expect(top(screen.getByTestId("agent-panel"))).toBeLessThan(why);
    expect(why).toBeLessThan(top(screen.getByTestId("phone-join")));
    expect(screen.queryByTestId("join-qr")).toBeNull();
  });

  it("replaces the QR with a Join link to the join URL", () => {
    layout(blocked);
    const join = screen.getByRole("link", { name: "Join" });
    expect(join.getAttribute("href")).toMatch(/\/join$/);
  });

  it("puts the event board right under the header once the plan is booked, and not before", () => {
    layout(blocked);
    expect(screen.queryByTestId("phone-event")).toBeNull();
    cleanup();
    layout(booked);
    const event = top(screen.getByTestId("phone-event"));
    expect(top(screen.getByTestId("phone-header"))).toBeLessThan(event);
    expect(event).toBeLessThan(top(screen.getByTestId("phone-track")));
  });

  it("shows the latest 3 chat messages and a Show chat toggle for the rest", () => {
    layout(blocked);
    const chat = screen.getByTestId("phone-chat");
    const rows = () => chat.querySelectorAll('[data-testid="person-name"]').length;
    expect(rows()).toBe(COLLAPSED_MESSAGES);
    fireEvent.click(screen.getByRole("button", { name: "Show chat" }));
    expect(rows()).toBe(blocked.messages.length);
    fireEvent.click(screen.getByRole("button", { name: "Hide chat" }));
    expect(rows()).toBe(COLLAPSED_MESSAGES);
  });

  it("renders the track top to bottom with the portrait orientation", () => {
    layout(blocked);
    expect(screen.getAllByTestId("track-node")).toHaveLength(6);
    expect(screen.getByTestId("train")).toBeTruthy();
  });

  it("renders with no plan: header status only, no agent, no explanation section", () => {
    layout(noPlan);
    expect(screen.getByTestId("phone-header").textContent).toBeTruthy();
    expect(screen.queryByTestId("agent-panel")).toBeNull();
  });
});

describe("visibleMessages and rowCharsFor", () => {
  it("keeps the newest messages, in order, until opened", () => {
    const all = [1, 2, 3, 4, 5];
    expect(visibleMessages(all, false)).toEqual([3, 4, 5]);
    expect(visibleMessages(all, true)).toEqual(all);
    expect(visibleMessages([1, 2], false)).toEqual([1, 2]);
  });
  it("fits whole flap rows beside the gutter, never fewer than 14 or more than 26", () => {
    expect(rowCharsFor(358)).toBe(21);
    expect(rowCharsFor(328)).toBe(19);
    expect(rowCharsFor(100)).toBe(14);
    expect(rowCharsFor(2000)).toBe(26);
  });
});

describe("StageApp breakpoint", () => {
  const mount = () => {
    current = data(blocked);
    return render(<StageApp />);
  };

  it("uses the scaled 1920 canvas on a wide landscape screen", () => {
    setViewport(1920, 1080);
    const view = mount();
    expect(view.container.querySelector(".stage-root-projector")).not.toBeNull();
    expect(view.queryByTestId("phone-layout")).toBeNull();
    expect(view.queryByTestId("join-qr")).not.toBeNull();
  });

  it("uses the phone layout on a phone and switches cleanly on rotation, keeping the same state", () => {
    setViewport(390, 844);
    const view = mount();
    expect(view.queryByTestId("phone-layout")).not.toBeNull();
    expect(view.queryByTestId("join-qr")).toBeNull();
    setViewport(1024, 768);
    act(() => void window.dispatchEvent(new Event("resize")));
    expect(view.queryByTestId("phone-layout")).toBeNull();
    expect(view.queryByTestId("join-qr")).not.toBeNull();
    setViewport(844, 390);
    act(() => void window.dispatchEvent(new Event("resize")));
    expect(view.queryByTestId("phone-layout")).not.toBeNull();
  });
});
