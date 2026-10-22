import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SplitFlap } from "../components/SplitFlap";
import { useWordReveal } from "../components/useWordReveal";
import { useTypedLength } from "../right/useTimed";
import { useSettleKey } from "./useSettleKey";

function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

const cellsText = (container: HTMLElement) => Array.from(container.querySelectorAll("[aria-hidden]")).map((c) => c.textContent).join("");

beforeEach(() => {
  vi.useFakeTimers();
  mockReducedMotion(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SplitFlap", () => {
  it("is only as wide as its text (no padding cells)", () => {
    const { container } = render(<SplitFlap text="Go" />);
    expect(container.querySelectorAll("[aria-hidden]")).toHaveLength(2);
  });

  it("flips through other glyphs, then lands on the text", () => {
    const { container, rerender } = render(<SplitFlap text="" />);
    rerender(<SplitFlap text="GO" />);
    act(() => void vi.advanceTimersByTime(60));
    expect(cellsText(container)).not.toBe("GO");
    act(() => void vi.advanceTimersByTime(2000));
    expect(cellsText(container)).toBe("GO");
  });

  it("settle-net: a timer after the last flip forces the final text, whatever the cells show", () => {
    const { container, rerender } = render(<SplitFlap text="" />);
    rerender(<SplitFlap text="GO" />);
    // Flip timers are 52ms steps (6 flips + the target, 25ms stagger); the net is 300ms after the last.
    act(() => void vi.advanceTimersByTime(7 * 52 + 25 + 300));
    expect(cellsText(container)).toBe("GO");
  });

  it("under reduced motion shows the new text at once", () => {
    mockReducedMotion(true);
    const { container, rerender } = render(<SplitFlap text="BLOCKED" />);
    rerender(<SplitFlap text="VIABLE" />);
    expect(cellsText(container)).toBe("VIABLE");
  });
});

describe("useWordReveal", () => {
  it("reveals word by word, and the net shows everything even if the reveal was interrupted", () => {
    const { result, rerender } = renderHook(({ text, streaming }) => useWordReveal(text, streaming), {
      initialProps: { text: "one two three", streaming: null as string | null },
    });
    expect(result.current).toBe(3);
    rerender({ text: "alpha beta gamma delta", streaming: null });
    expect(result.current).toBe(0);
    // A stream flickers on and off mid-reveal, which cancels the reveal interval.
    act(() => void vi.advanceTimersByTime(70));
    rerender({ text: "alpha beta gamma delta", streaming: "alpha" });
    rerender({ text: "alpha beta gamma delta", streaming: null });
    act(() => void vi.advanceTimersByTime(4 * 60 + 500));
    expect(result.current).toBe(4);
  });

  it("shows every word at once under reduced motion", () => {
    mockReducedMotion(true);
    const { result, rerender } = renderHook(({ text }) => useWordReveal(text, null), { initialProps: { text: "a b" } });
    rerender({ text: "a b c d e" });
    expect(result.current).toBe(5);
  });
});

describe("useTypedLength", () => {
  it("types a fresh line, and the net completes it", () => {
    const { result } = renderHook(() => useTypedLength("hello world", true));
    expect(result.current).toBe(0);
    act(() => void vi.advanceTimersByTime(11 * 22 + 500));
    expect(result.current).toBe(11);
  });
  it("shows the whole line under reduced motion", () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useTypedLength("hello world", true));
    expect(result.current).toBe(11);
  });
});

describe("useSettleKey", () => {
  it("bumps the key once the time has passed, and flags settled until the trigger changes", () => {
    const { result, rerender } = renderHook(({ t }) => useSettleKey(500, t), { initialProps: { t: "a" } });
    expect(result.current).toEqual({ key: 0, settled: false });
    act(() => void vi.advanceTimersByTime(499));
    expect(result.current.key).toBe(0);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toEqual({ key: 1, settled: true });
    rerender({ t: "b" });
    expect(result.current.settled).toBe(false);
    act(() => void vi.advanceTimersByTime(500));
    expect(result.current).toEqual({ key: 2, settled: true });
  });
});

