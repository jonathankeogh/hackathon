import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { agentAsking, blocked } from "../../fixtures";
import { QR_SIZE, QUIET_ZONE_MODULES } from "../components/JoinQR";
import { RightColumn } from "./RightColumn";

afterEach(cleanup);

describe("RightColumn", () => {
  it("draws the QR at least 220px with the full quiet zone and dark modules on a light plate", () => {
    expect(QR_SIZE).toBeGreaterThanOrEqual(220);
    expect(QUIET_ZONE_MODULES).toBeGreaterThanOrEqual(4);
    const { getByTestId } = render(<RightColumn state={blocked} streaming={null} resolved={false} />);
    const svg = getByTestId("join-qr").querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe(String(QR_SIZE));
    const fills = Array.from(svg.querySelectorAll("path")).map((p) => p.getAttribute("fill"));
    expect(fills).toContain("#EDEAE2"); // light plate
    expect(fills).toContain("#0E0E0C"); // dark modules
  });

  it("the agent panel takes no space without agent activity, and appears with it", () => {
    const { container, rerender } = render(<RightColumn state={blocked} streaming={null} resolved={false} />);
    const slot = () => container.querySelector("[data-slot='right-column']")!.firstElementChild as HTMLElement;
    expect(slot().style.display).toBe("none");
    expect(container.querySelector("[data-testid='agent-panel']")).toBeNull();
    rerender(<RightColumn state={agentAsking} streaming={null} resolved={false} />);
    expect(slot().style.display).not.toBe("none");
    expect(container.querySelector("[data-testid='agent-panel']")).not.toBeNull();
  });

  it("shows the attendee count as value over '/ target', with the odometer beside the QR", () => {
    const { getByTestId } = render(<RightColumn state={agentAsking} streaming={null} resolved={false} />);
    expect(getByTestId("odometer").getAttribute("aria-label")).toBe("12 of 15 attendees");
    expect(getByTestId("odometer").textContent).toContain("/ 15");
  });
});
