import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { Marquee } from "./Marquee";
import { Odometer, odometerDigits } from "../landing/LandingOdometer";
import { Reveal } from "./Reveal";
import { StatusCell } from "./StatusCell";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Odometer", () => {
  it("splits a value into zero padded digits and clamps bad input", () => {
    expect(odometerDigits(7, 3)).toEqual([0, 0, 7]);
    expect(odometerDigits(1284)).toEqual([1, 2, 8, 4]);
    expect(odometerDigits(-4)).toEqual([0]);
    expect(odometerDigits(Number.NaN, 2)).toEqual([0, 0]);
    expect(odometerDigits(12.9)).toEqual([1, 2]);
  });

  it("slides each column to its digit and exposes the number to assistive tech", () => {
    const { container } = render(<Odometer value={47} />);
    expect(screen.getByRole("img", { name: "47" })).toBeTruthy();
    const strips = Array.from(container.querySelectorAll<HTMLElement>(".ds-odo-strip"));
    expect(strips.map((s) => s.style.transform)).toEqual(["translateY(-4em)", "translateY(-7em)"]);
  });
});

describe("StatusCell", () => {
  it("fills by status with the default word, and the word can be overridden", () => {
    const { container, rerender } = render(<StatusCell status="blocked" />);
    expect(container.querySelector('[data-status="blocked"]')?.textContent).toBe("BLOCKED");
    rerender(<StatusCell status="booked" />);
    expect(container.querySelector('[data-status="booked"]')?.textContent).toBe("BOOKED");
    rerender(<StatusCell status="waiting" label="ASKING" />);
    expect(screen.getByText("ASKING")).toBeTruthy();
  });
});

describe("Marquee", () => {
  it("renders the content twice and hides the copy from assistive tech", () => {
    const { container } = render(
      <Marquee label="Plans" seconds={30} reverse>
        <span>WE SHOULD</span>
      </Marquee>,
    );
    expect(screen.getAllByText("WE SHOULD")).toHaveLength(2);
    expect(container.querySelector("[data-copy]")?.getAttribute("aria-hidden")).toBe("true");
    const root = container.querySelector<HTMLElement>(".ds-marquee")!;
    expect(root.getAttribute("data-reverse")).toBe("true");
    expect(root.style.getPropertyValue("--ds-marquee-s")).toBe("30s");
  });
});

describe("Reveal", () => {
  beforeEach(() => vi.useFakeTimers());

  it("is visible at once where IntersectionObserver is missing", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<Reveal>hello</Reveal>);
    expect(container.querySelector(".ds-reveal")?.getAttribute("data-in")).toBe("true");
  });

  it("stays hidden until the observer fires, then stays shown", () => {
    let callback: IntersectionObserverCallback = () => undefined;
    class FakeObserver {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const { container } = render(<Reveal>hello</Reveal>);
    const el = container.querySelector(".ds-reveal")!;
    expect(el.getAttribute("data-in")).toBe("false");
    act(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(el.getAttribute("data-in")).toBe("true");
  });
});

describe("Button size", () => {
  it("has a 44px small size for navigation bars", () => {
    render(<Button size="sm">Sign up</Button>);
    expect(screen.getByRole("button").className).toContain("ds-button-sm");
  });
});
