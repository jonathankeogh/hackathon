import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StepRail, stepStatus, type Step } from "./StepRail";

afterEach(cleanup);

const STEPS: Step[] = [
  { id: "you", label: "You" },
  { id: "link", label: "Link" },
  { id: "group", label: "Group" },
  { id: "ready", label: "Ready" },
];

const lamps = (container: HTMLElement) => Array.from(container.querySelectorAll(".ds-lamp")).map((l) => l.getAttribute("data-state"));

describe("StepRail", () => {
  it("lights done steps green, the current step amber and the rest off", () => {
    const { container } = render(<StepRail steps={STEPS} current="group" />);
    expect(lamps(container)).toEqual(["green", "green", "amber", "off"]);
  });

  it("marks only the current step with aria-current", () => {
    render(<StepRail steps={STEPS} current="link" />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("aria-current"))).toEqual([null, "step", null, null]);
  });

  it("starts with the first step current, and finishes all green when complete", () => {
    const first = render(<StepRail steps={STEPS} current="you" />);
    expect(lamps(first.container)).toEqual(["amber", "off", "off", "off"]);
    cleanup();
    const done = render(<StepRail steps={STEPS} current="ready" complete />);
    expect(lamps(done.container)).toEqual(["green", "green", "green", "green"]);
  });

  it("falls back to the first step for an unknown id", () => {
    const { container } = render(<StepRail steps={STEPS} current="nope" />);
    expect(lamps(container)[0]).toBe("amber");
  });

  it("derives status from indexes", () => {
    expect(stepStatus(0, 1, false)).toBe("done");
    expect(stepStatus(1, 1, false)).toBe("current");
    expect(stepStatus(2, 1, false)).toBe("upcoming");
    expect(stepStatus(2, 1, true)).toBe("done");
  });

  it("labels each step in mono capitals", () => {
    render(<StepRail steps={STEPS} current="you" />);
    expect(screen.getByText("Link").style.textTransform).toBe("uppercase");
  });
});
