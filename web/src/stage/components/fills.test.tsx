import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { agentAsking, blocked } from "../../fixtures";
import { ChangedConditionLine } from "../track/ChangedConditionLine";
import { colors } from "../tokens";
import { statusView } from "./DepartureBoard";
import { PersonName } from "./PersonName";
import { SplitFlap } from "./SplitFlap";
import { WhyPanel } from "./WhyPanel";

afterEach(cleanup);

describe("signal colours are fills, never text", () => {
  it("status flap cells are filled with the signal colour and the letters take the background colour", () => {
    expect(statusView(blocked.plan).fill).toBe(colors.red);
    expect(statusView({ ...blocked.plan!, status: "viable" }).fill).toBe(colors.green);
    expect(statusView({ ...blocked.plan!, status: "booked" }).fill).toBe(colors.green);
    expect(statusView(null).fill).toBeUndefined();
    const { container } = render(<SplitFlap text="BLOCKED" fill={colors.red} />);
    const cell = container.querySelector("[aria-hidden]") as HTMLElement;
    expect(cell.style.background).toBe("rgb(255, 59, 48)");
    expect(cell.style.color).toBe("rgb(14, 14, 12)");
  });

  it("a person's name is fg text after a 10px square in their colour", () => {
    const person = agentAsking.people[0]!;
    const { getByTestId } = render(<PersonName person={person} />);
    const name = getByTestId("person-name");
    const swatch = getByTestId("person-swatch");
    expect(name.style.color).toBe("rgb(237, 234, 226)");
    expect(swatch.style.width).toBe("10px");
    expect(swatch.style.height).toBe("10px");
    expect(swatch.style.background).not.toBe("");
    expect(name.textContent).toBe(person.name);
  });

  it("the resolved line is fg text after a green-filled lamp", () => {
    const { getByTestId } = render(<WhyPanel text="x" streaming={null} resolved />);
    const line = getByTestId("plan-go");
    expect(line.className).toContain("text-fg");
    expect(line.className).not.toContain("signal-green");
    expect((line.firstElementChild as HTMLElement).style.background).toBe("rgb(61, 220, 132)");
    expect(line.textContent).toBe("NOTHING. THE PLAN IS GO.");
  });

  it("the new condition is on an amber plate with background-colour text; the old one is fg at 60%, struck", () => {
    const { getByTestId } = render(<ChangedConditionLine change={{ resource: "attendees", from: "15+", to: "12+" }} />);
    const to = getByTestId("changed-condition-to");
    expect(to.style.background).toBe("rgb(255, 176, 0)");
    expect(to.style.color).toBe("rgb(14, 14, 12)");
    expect(getByTestId("changed-condition-from").style.color).toBe("rgba(237, 234, 226, 0.6)");
  });
});
