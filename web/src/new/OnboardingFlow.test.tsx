import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WaStatus } from "./flow";

type Handler = (...args: unknown[]) => void;
const handlers = new Map<string, Set<Handler>>();
const emit = vi.fn();
vi.mock("../socket", () => ({
  socket: {
    connected: true,
    emit: (...args: unknown[]) => emit(...args),
    on: (event: string, fn: Handler) => void (handlers.get(event) ?? handlers.set(event, new Set()).get(event)!).add(fn),
    off: (event: string, fn: Handler) => void handlers.get(event)?.delete(fn),
  },
}));

import OnboardingFlow from "./OnboardingFlow";

const push = (event: string, payload?: unknown) => act(() => handlers.get(event)?.forEach((fn) => fn(payload)));
const status = (s: WaStatus) => push("wa:status", s);

beforeEach(() => {
  vi.useFakeTimers();
  emit.mockClear();
  handlers.clear();
  sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ joinUrl: "https://x.test/join" }) })));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function signUp(name: string, email: string) {
  fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

describe("OnboardingFlow", () => {
  it("watches the bridge on mount and starts on the landing page", () => {
    render(<OnboardingFlow />);
    expect(emit).toHaveBeenCalledWith("wa:watch");
    expect(screen.getByRole("button", { name: "Sign up" })).toBeTruthy();
  });

  it("offers the stage first when a plan is already live", () => {
    render(<OnboardingFlow />);
    status({ status: "connected", active: { jid: "a@g.us", name: "Flat 4" } });
    expect(screen.getByRole("link", { name: "Open stage" }).getAttribute("href")).toBe("/stage");
    expect(screen.queryByRole("button", { name: "Sign up" })).toBeNull();
  });

  it("blocks Continue on bad input and does not start the bridge", () => {
    render(<OnboardingFlow />);
    signUp("", "nope");
    expect(screen.getAllByTestId("field-error-marker")).toHaveLength(2);
    expect(emit).not.toHaveBeenCalledWith("wa:new");
  });

  it("runs sign up, scan and live", () => {
    render(<OnboardingFlow />);
    signUp(" Sam ", "sam@example.com");
    expect(emit).toHaveBeenCalledWith("wa:new");
    expect(JSON.parse(sessionStorage.getItem("deadlock.organiser")!)).toEqual({ name: "Sam", email: "sam@example.com" });
    expect(screen.getByText("Starting the bridge")).toBeTruthy();

    status({ status: "qr", qr: "2@abc,def,ghi" });
    expect(screen.getByTestId("qr-plate")).toBeTruthy();

    status({ status: "connected" });
    expect(screen.getByText("You’re live, Sam.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open stage" })).toBeTruthy();
  });

  it("mentions the bridge command only after a wait", () => {
    render(<OnboardingFlow />);
    signUp("Sam", "sam@example.com");
    expect(screen.queryByText(/run-bridge/)).toBeNull();
    act(() => void vi.advanceTimersByTime(8100));
    expect(screen.getByText(/run-bridge/)).toBeTruthy();
  });

  it("confirms start over in place, then asks for a fresh QR", () => {
    render(<OnboardingFlow />);
    signUp("Sam", "sam@example.com");
    status({ status: "qr", qr: "2@abc" });
    status({ status: "connected" });
    emit.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(emit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.getByRole("button", { name: "Start over" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Unlink and start over" }));
    expect(emit).toHaveBeenCalledWith("wa:new");
    expect(screen.getByText("Starting the bridge")).toBeTruthy();
  });

  it("says plainly when the admin link is needed", () => {
    render(<OnboardingFlow />);
    push("admin:denied");
    expect(screen.getByRole("alert").textContent).toContain("admin link");
  });
});
