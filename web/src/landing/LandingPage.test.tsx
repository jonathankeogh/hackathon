import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "./LandingPage";
import { PRELOADER, PRELOADER_KEY } from "./preloaderLogic";

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  stubReducedMotion(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LandingPage", () => {
  it("shows the whole page: headline, scenes and the three section marks", () => {
    render(<LandingPage live={false} onSignUp={() => undefined} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Deadlock makes it happen.");
    expect(screen.getByRole("heading", { name: "Three steps, no meeting." })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "What a cleared line looks like." })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Start an event" })).toBeTruthy();
    expect(screen.getByText("Built at the Grok hackathon, London, 2026")).toBeTruthy();
    expect(screen.getByText("Demo numbers from rehearsal runs. Not live metrics.")).toBeTruthy();
  });

  it("hands every Sign up button to onSignUp", () => {
    const onSignUp = vi.fn();
    render(<LandingPage live={false} onSignUp={onSignUp} />);
    const buttons = screen.getAllByRole("button", { name: "Sign up" });
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    buttons.forEach((b) => fireEvent.click(b));
    expect(onSignUp).toHaveBeenCalledTimes(buttons.length);
  });

  it("offers Open stage first when an event is live, and says where", () => {
    render(<LandingPage live liveIn="Flat 4" onSignUp={() => undefined} />);
    const links = screen.getAllByRole("link", { name: "Open stage" });
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(links.every((l) => l.getAttribute("href") === "/stage")).toBe(true);
    expect(screen.queryByRole("button", { name: "Sign up" })).toBeNull();
    expect(screen.getAllByText("Live in Flat 4").length).toBeGreaterThan(0);
  });

  it("plays the preloader once per session, holds the hero until it lifts, and skips on a key press", () => {
    const { container, unmount } = render(<LandingPage live={false} onSignUp={() => undefined} />);
    expect(screen.getByTestId("preloader")).toBeTruthy();
    expect(container.querySelector(".lp-hero")?.getAttribute("data-ready")).toBe("false");
    act(() => void vi.advanceTimersByTime(PRELOADER.done + 100));
    expect(screen.queryByTestId("preloader")).toBeNull();
    expect(container.querySelector(".lp-hero")?.getAttribute("data-ready")).toBe("true");
    expect(sessionStorage.getItem(PRELOADER_KEY)).toBe("1");
    unmount();

    render(<LandingPage live={false} onSignUp={() => undefined} />);
    expect(screen.queryByTestId("preloader")).toBeNull();

    sessionStorage.clear();
    cleanup();
    render(<LandingPage live={false} onSignUp={() => undefined} />);
    expect(screen.getByTestId("preloader")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Enter" });
    act(() => void vi.advanceTimersByTime(500));
    expect(screen.queryByTestId("preloader")).toBeNull();
  });

  it("under reduced motion: no preloader, no pin, the finished story, and no cursor", () => {
    stubReducedMotion(true);
    const { container } = render(<LandingPage live={false} onSignUp={() => undefined} />);
    expect(screen.queryByTestId("preloader")).toBeNull();
    expect(container.querySelector(".lp-scene")?.getAttribute("data-static")).toBe("true");
    expect(container.querySelector(".lp-cursor")).toBeNull();
    expect(container.querySelector(".lp")?.getAttribute("data-cursor")).toBeNull();
    // the finished picture: all signals green, plan booked, every chat line there
    expect(container.querySelectorAll(".lp-msg")).toHaveLength(7);
    expect(screen.getAllByText("Yeah 12 is fine".toLowerCase()).length).toBeGreaterThan(0);
    expect(container.querySelector('.lp-node [data-state="green"]')).not.toBeNull();
  });

  it("draws the signal lamp cursor for a mouse: hidden until it moves, amber, green over a button", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("hover: hover"), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
    vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => window.setTimeout(() => fn(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    const { container } = render(<LandingPage live={false} onSignUp={() => undefined} />);
    const cursor = container.querySelector(".lp-cursor")!;
    expect(cursor.getAttribute("data-shown")).toBe("false");
    expect(container.querySelector(".lp")?.getAttribute("data-cursor")).toBe("on");
    const heading = screen.getByRole("heading", { level: 1 });
    act(() => void fireEvent(heading, new MouseEvent("pointermove", { bubbles: true, clientX: 40, clientY: 50 })));
    expect(cursor.getAttribute("data-shown")).toBe("true");
    expect(cursor.getAttribute("data-tone")).toBe("amber");
    act(() => void fireEvent(screen.getAllByRole("button", { name: "Sign up" })[0]!, new MouseEvent("pointermove", { bubbles: true, clientX: 60, clientY: 60 })));
    expect(cursor.getAttribute("data-tone")).toBe("green");
  });

  it("never draws the cursor lamp without a fine pointer", () => {
    const { container } = render(<LandingPage live={false} onSignUp={() => undefined} />);
    expect(container.querySelector(".lp-cursor")).toBeNull();
  });
});
