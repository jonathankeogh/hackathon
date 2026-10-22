import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Notice } from "./Notice";
import { QRPlate, shortUrl } from "./QRPlate";
import { SignalLamp } from "./SignalLamp";
import { colors } from "./tokens";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SignalLamp", () => {
  it("fills with the signal colour and is decorative without a label", () => {
    const { container } = render(<SignalLamp state="green" />);
    const lamp = container.querySelector(".ds-lamp") as HTMLElement;
    expect(lamp.style.backgroundColor).toBe("rgb(61, 220, 132)");
    expect(lamp.getAttribute("aria-hidden")).toBe("true");
  });

  it("flashes on change, then the settle-net clears it", () => {
    const { container, rerender } = render(<SignalLamp state="amber" flash />);
    rerender(<SignalLamp state="green" flash />);
    expect(container.querySelector(".ds-lamp-flash")).not.toBeNull();
    act(() => void vi.advanceTimersByTime(1000));
    expect(container.querySelector(".ds-lamp-flash")).toBeNull();
  });

  it("does not flash when flash is off", () => {
    const { container, rerender } = render(<SignalLamp state="amber" />);
    rerender(<SignalLamp state="green" />);
    expect(container.querySelector(".ds-lamp-flash")).toBeNull();
  });
});

describe("Notice", () => {
  it("puts the colour on the lamp and keeps the text plain, then drops its entrance", () => {
    const { container } = render(<Notice tone="error">Link failed</Notice>);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(container.querySelector('[data-state="red"]')).not.toBeNull();
    expect((screen.getByText("Link failed") as HTMLElement).style.color).toBe("rgb(237, 234, 226)");
    expect(container.querySelector(".ds-enter-fade")).not.toBeNull();
    act(() => void vi.advanceTimersByTime(1000));
    expect(container.querySelector(".ds-enter-fade")).toBeNull();
  });
});

describe("QRPlate", () => {
  it("draws dark modules on a light plate with the short URL under it", () => {
    const { container } = render(<QRPlate value="https://deadlock.app/j/abc" />);
    expect(screen.getByText("deadlock.app/j/abc")).toBeTruthy();
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.innerHTML.toLowerCase()).toContain(colors.text.toLowerCase());
    expect(svg.innerHTML.toLowerCase()).toContain(colors.bg.toLowerCase());
  });

  it("shortens URLs", () => {
    expect(shortUrl("https://a.b/c/")).toBe("a.b/c");
  });
});
