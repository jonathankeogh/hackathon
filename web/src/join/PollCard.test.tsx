import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Poll } from "@deadlock/shared/types";
import { PollCard } from "./PollCard";

const poll: Poll = { bringOptions: ["Snacks", "Cards", "Just me"], answers: [{ personId: "x", going: "yes", bring: [], guests: 2 }] };
afterEach(cleanup);

const tap = (id: string) => fireEvent.click(within(screen.getByTestId(id)).getByRole("button"));

describe("PollCard", () => {
  it("saves on every tap: coming, what you bring, guests", () => {
    const onAnswer = vi.fn();
    render(<PollCard poll={poll} personId="me" onAnswer={onAnswer} />);
    expect(screen.queryByText("What are you bringing?")).toBeNull();

    tap("going-yes");
    expect(onAnswer).toHaveBeenLastCalledWith({ personId: "me", going: "yes", bring: [], guests: 0 });
    tap("bring-Snacks");
    tap("bring-Cards");
    tap("guests-plus");
    tap("guests-plus");
    expect(onAnswer).toHaveBeenLastCalledWith({ personId: "me", going: "yes", bring: ["Snacks", "Cards"], guests: 2 });
    expect(screen.getByTestId("guests").textContent).toBe("+2 guests");

    // "Just me" stands alone; choosing an item again replaces it.
    tap("bring-Just me");
    expect(onAnswer).toHaveBeenLastCalledWith({ personId: "me", going: "yes", bring: ["Just me"], guests: 2 });
    tap("bring-Cards");
    expect(onAnswer).toHaveBeenLastCalledWith({ personId: "me", going: "yes", bring: ["Cards"], guests: 2 });
  });

  it("can't make it clears what you bring and your guests, and hides those questions", () => {
    const onAnswer = vi.fn();
    render(<PollCard poll={poll} personId="me" onAnswer={onAnswer} />);
    tap("going-yes");
    tap("bring-Snacks");
    tap("going-no");
    expect(onAnswer).toHaveBeenLastCalledWith({ personId: "me", going: "no", bring: [], guests: 0 });
    expect(screen.queryByText("What are you bringing?")).toBeNull();
    expect(screen.queryByText("Bringing anyone?")).toBeNull();
  });

  it("starts from your saved answer, and shows the room's total", () => {
    render(<PollCard poll={{ ...poll, answers: [...poll.answers, { personId: "me", going: "maybe", bring: ["Cards"], guests: 0 }] }} personId="me" onAnswer={vi.fn()} />);
    expect(screen.getByTestId("going-maybe").dataset.on).toBe("true");
    expect(screen.getByText("1 in, +2 guests")).toBeTruthy();
  });
});
