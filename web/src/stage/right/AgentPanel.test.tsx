import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { agentAsking, askAccepted, blocked } from "../../fixtures";
import { AgentPanel } from "./AgentPanel";

afterEach(cleanup);

describe("AgentPanel", () => {
  it("renders nothing for a v1 state", () => {
    const { container } = render(<AgentPanel state={blocked} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the log lines and an amber lamp with ASKING PRIYA while the ask is open", () => {
    const { getAllByTestId, getByTestId, getByText } = render(<AgentPanel state={agentAsking} />);
    expect(getAllByTestId("agent-log-line")).toHaveLength(3);
    expect(getByTestId("agent-ask-heading").textContent).toBe("ASKING PRIYA");
    expect(getByText(agentAsking.asks![0]!.question)).toBeTruthy();
    expect(getByTestId("agent-ask").querySelector("[data-testid='signal-lamp']")?.getAttribute("data-status")).toBe("amber");
  });

  it("reads PRIYA SAID YES on a green lamp once accepted, and RED/NO when declined", () => {
    const { getByTestId, rerender } = render(<AgentPanel state={askAccepted} />);
    expect(getByTestId("agent-ask-heading").textContent).toBe("PRIYA SAID YES");
    expect(getByTestId("agent-ask").querySelector("[data-testid='signal-lamp']")?.getAttribute("data-status")).toBe("green");
    rerender(<AgentPanel state={{ ...askAccepted, asks: [{ ...askAccepted.asks![0]!, status: "declined" }] }} />);
    expect(getByTestId("agent-ask-heading").textContent).toBe("PRIYA SAID NO");
    expect(getByTestId("agent-ask").querySelector("[data-testid='signal-lamp']")?.getAttribute("data-status")).toBe("red");
  });

  it("shows only the last four log lines", () => {
    const state = { ...agentAsking, agentLog: ["1", "2", "3", "4", "5"] };
    const { getAllByTestId } = render(<AgentPanel state={state} />);
    expect(getAllByTestId("agent-log-line").map((e) => e.textContent)).toEqual(["2", "3", "4", "5"]);
  });
});
