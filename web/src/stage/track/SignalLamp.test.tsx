import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { blocked, booked } from "../../fixtures";
import { initialSnapshot } from "../cascade/sequencer";
import { SignalLamp, lampColor } from "./SignalLamp";
import { TrackPanel } from "./TrackPanel";

afterEach(cleanup);

const lamp = (status: Parameters<typeof SignalLamp>[0]["status"], onLitChange?: (lit: boolean) => void) => (
  <svg>
    <SignalLamp cx={50} cy={50} r={15} housingR={22} status={status} onLitChange={onLitChange} />
  </svg>
);

describe("SignalLamp", () => {
  it("exposes its status", () => {
    const { getByTestId } = render(lamp("amber"));
    expect(getByTestId("signal-lamp").getAttribute("data-status")).toBe("amber");
  });

  it("reports lit changes but not the initial render", () => {
    const spy = vi.fn();
    const { rerender } = render(lamp("off", spy));
    expect(spy).not.toHaveBeenCalled();
    rerender(lamp("green", spy));
    expect(spy).toHaveBeenCalledWith(true);
    rerender(lamp("red", spy));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("is a flat disc in a solid 2.5px fg ring: no filter, no blur, no glow", () => {
    const { container } = render(lamp("green"));
    expect(container.querySelector("filter, feGaussianBlur, defs")).toBeNull();
    expect(container.querySelector("[filter]")).toBeNull();
    const ring = container.querySelector("circle[stroke]");
    expect(ring?.getAttribute("stroke-width")).toBe("2.5");
    expect(ring?.getAttribute("stroke")).toBe("rgba(237, 234, 226, 0.35)");
    expect(ring?.getAttribute("fill")).toBe("none");
  });

  it("derives colour from the tokens only", () => {
    expect(lampColor("red")).toBe("#FF3B30");
    expect(lampColor("amber")).toBe("#FFB000");
    expect(lampColor("green")).toBe("#3DDC84");
  });
});

describe("TrackPanel", () => {
  it("renders a lamp per node and quotes every commitment verbatim", () => {
    const { getAllByTestId, container } = render(<TrackPanel state={blocked} cascade={initialSnapshot(blocked)} />);
    expect(getAllByTestId("signal-lamp")).toHaveLength(6);
    for (const c of blocked.commitments) expect(container.textContent).toContain(`"${c.quote}"`);
  });

  it("powers connectors green only from unlocked sources", () => {
    const dim = render(<TrackPanel state={blocked} cascade={initialSnapshot(blocked)} />);
    expect(dim.getAllByTestId("track-connector").every((c) => c.getAttribute("data-powered") === "false")).toBe(true);
    dim.unmount();
    const lit = render(<TrackPanel state={booked} cascade={initialSnapshot(booked)} />);
    expect(lit.getAllByTestId("track-connector").every((c) => c.getAttribute("data-powered") === "true")).toBe(true);
  });

  it("colours lamps and connectors from the displayed status, not the raw commitment status", () => {
    const held = {
      displayedStatus: Object.fromEntries(booked.commitments.map((c) => [c.id, "waiting" as const])),
      flashing: new Set<string>(),
      planLit: false,
    };
    const { getAllByTestId } = render(<TrackPanel state={booked} cascade={held} />);
    const statuses = getAllByTestId("signal-lamp").map((l) => l.getAttribute("data-status"));
    expect(statuses.filter((x) => x === "green")).toHaveLength(1); // the audience, already at 17 / 15
    expect(statuses).toContain("red"); // PLAN stays red until planLit
    const powered = getAllByTestId("track-connector").filter((c) => c.getAttribute("data-powered") === "true");
    expect(powered.length).toBeLessThan(getAllByTestId("track-connector").length);
  });

  it("holds the connectors into PLAN idle until the plan is lit, then powers them", () => {
    const view = (planLit: boolean) => (
      <TrackPanel state={booked} cascade={{ ...initialSnapshot(booked), planLit }} />
    );
    const { getAllByTestId, rerender } = render(view(false));
    const into = () => getAllByTestId("track-connector");
    const idle = into().filter((c) => c.getAttribute("data-powered") === "false").length;
    expect(idle).toBeGreaterThan(0);
    rerender(view(true));
    expect(into().every((c) => c.getAttribute("data-powered") === "true")).toBe(true);
  });

  it("lights a lamp as soon as the cascade displays it", () => {
    const cascade = initialSnapshot(booked);
    const { getAllByTestId } = render(<TrackPanel state={booked} cascade={cascade} />);
    expect(getAllByTestId("signal-lamp").every((l) => l.getAttribute("data-status") === "green")).toBe(true);
  });
});
