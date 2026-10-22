import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentAsking, askAccepted, blocked, booked, noPlan } from "../fixtures";
import type { StageData } from "./data/types";
import type { StateV2 } from "./data/v2types";

let current: StageData;
vi.mock("./data/useStageData", () => ({ useStageData: () => current }));

import { StageApp } from "./StageApp";

const data = (state: StateV2): StageData => ({ ready: true, state, events: [], streaming: null });
const empty: StateV2 = { ...noPlan, messages: [], plan: null, commitments: [], asks: [], agentLog: [], explanation: "" };

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const show = (view: ReturnType<typeof render>, state: StateV2) => {
  current = data(state);
  act(() => view.rerender(<StageApp />));
};

describe("StageApp reset", () => {
  it("shows the struck old condition when it saw the change, and forgets it after a reset", () => {
    current = data(agentAsking);
    const view = render(<StageApp />);
    expect(view.queryByTestId("changed-condition")).toBeNull();
    show(view, askAccepted);
    expect(view.queryByTestId("changed-condition")).not.toBeNull();

    // "New event": plan null, nothing on the track, no agent activity.
    show(view, empty);
    expect(view.queryByTestId("changed-condition")).toBeNull();
    expect(view.queryByTestId("agent-panel")).toBeNull();
    expect(view.queryAllByTestId("track-node")).toHaveLength(2); // audience and PLAN only

    // The accepted state arrives again without the stage ever seeing the old value: nothing struck.
    show(view, askAccepted);
    expect(view.queryByTestId("changed-condition")).toBeNull();
  });

  it("does not replay the old cascade: a booked plan replaced by an empty one then a blocked one starts unlit", () => {
    current = data(booked);
    const view = render(<StageApp />);
    expect(view.getAllByTestId("signal-lamp").every((l) => l.getAttribute("data-status") === "green")).toBe(true);
    show(view, empty);
    show(view, blocked);
    expect(view.getAllByTestId("signal-lamp").some((l) => l.getAttribute("data-status") === "green")).toBe(false);
    act(() => void vi.advanceTimersByTime(3000));
    expect(view.getAllByTestId("signal-lamp").some((l) => l.getAttribute("data-status") === "green")).toBe(false);
  });
});
