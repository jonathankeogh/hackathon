import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readJoinMock } from "./devMock";
import { JoinView } from "./JoinView";
import type { JoinModel } from "./model";

vi.mock("../socket", () => ({ socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn(), connected: false } }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mock = (key: string, patch: Partial<JoinModel> = {}): JoinModel => ({ ...readJoinMock(`?mock=${key}`, true)!, ...patch });

describe("readJoinMock", () => {
  it("is off in production and for unknown keys", () => {
    expect(readJoinMock("?mock=join", false)).toBeNull();
    expect(readJoinMock("?mock=nope", true)).toBeNull();
    expect(readJoinMock("", true)).toBeNull();
  });
  it("maps each key to its screen", () => {
    const screens = ["join", "rsvp", "waiting", "notice", "suggest", "ask", "clear", "invite", "call", "connected"].map((k) => readJoinMock(`?mock=${k}`, true)?.screen);
    expect(screens).toEqual(["join", "rsvp", "waiting", "waiting", "suggest", "ask", "clear", "invite", "call", "call"]);
  });
});

describe("join screen", () => {
  it("sends the trimmed first name and blocks an empty one", () => {
    const join = vi.fn();
    render(<JoinView model={mock("join", { join })} />);
    const button = screen.getByRole("button", { name: "Join" });
    fireEvent.click(button);
    expect(join).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Your first name"), { target: { value: "  Ada " } });
    fireEvent.click(button);
    expect(join).toHaveBeenCalledWith("  Ada ");
  });
});

describe("rsvp screen", () => {
  it("offers three choices and reports the tapped role", () => {
    const chooseRole = vi.fn();
    render(<JoinView model={mock("rsvp", { chooseRole })} />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: /laptop/ }));
    expect(chooseRole).toHaveBeenCalledWith("laptop");
  });
});

describe("waiting screen", () => {
  it("shows the live count, the confirmation line and sends chat", () => {
    const sendChat = vi.fn();
    render(<JoinView model={mock("waiting", { sendChat })} />);
    expect(screen.getByTestId("rsvp-line").textContent).toBe("You're #13. 2 more to unlock the venue.");
    expect(screen.getByRole("img", { name: "13 of 15 going" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tell the chat"), { target: { value: "projector" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(sendChat).toHaveBeenCalledWith("projector");
    expect(screen.getByText("Sent to the chat.")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(3500));
    expect(screen.queryByText("Sent to the chat.")).toBeNull();
  });
  it("says so when the server refuses phone chat", () => {
    render(<JoinView model={mock("waiting", { chatDenied: true })} />);
    expect(screen.getByText("The chat is closed for this event.")).toBeTruthy();
  });
  it("shows the notice banner and dismisses it on tap", () => {
    render(<JoinView model={mock("notice")} />);
    fireEvent.click(screen.getByTestId("notice"));
    expect(screen.queryByTestId("notice")).toBeNull();
  });
});

describe("ask card", () => {
  it("shows the three plan ideas with counts and your vote filled, and emits the tapped option", () => {
    const voteSuggestion = vi.fn();
    render(<JoinView model={mock("suggest", { voteSuggestion })} />);
    expect(screen.getByText("Premier League: pick a plan")).toBeTruthy();
    expect(screen.getByText("01 Live")).toBeTruthy();
    expect(screen.getByText("02 Bar")).toBeTruthy();
    expect(screen.getByText("03 Area")).toBeTruthy();
    expect(screen.getByTestId("votes-live").textContent).toBe("2 votes");
    expect(screen.getByTestId("votes-venue").textContent).toBe("1 vote");
    expect(screen.getByTestId("votes-area").textContent).toBe("0 votes");
    expect(screen.getByTestId("vote-venue").getAttribute("data-mine")).toBe("true");
    expect(screen.getByTestId("vote-live").getAttribute("data-mine")).toBeNull();
    fireEvent.click(screen.getByText("Arsenal v Tottenham"));
    expect(voteSuggestion).toHaveBeenCalledWith("live");
  });
  it("answers yes and no", () => {
    const answerAsk = vi.fn();
    render(<JoinView model={mock("ask", { answerAsk })} />);
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(answerAsk.mock.calls).toEqual([[true], [false]]);
  });
});

describe("invite ticket", () => {
  it("shows the invite with when and where", () => {
    render(<JoinView model={mock("invite")} />);
    const ticket = screen.getByTestId("invite");
    expect(ticket.textContent).toContain("THU 29 OCT 18:30");
    expect(ticket.textContent).toContain("Priya's office");
    expect(ticket.textContent).toContain("you're in");
    expect(screen.getByTestId("good-to-know")).toBeTruthy();
  });
});

describe("call", () => {
  it("shows no transcript before Accept and speaks only after it", () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal("speechSynthesis", { speak, cancel });
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
    render(<JoinView model={mock("call", { callPreview: undefined })} />);
    expect(screen.queryByTestId("karaoke")).toBeNull();
    expect(speak).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("karaoke")).toBeTruthy();
    vi.unstubAllGlobals();
  });
  it("declining ends the call without speaking", () => {
    const endCall = vi.fn();
    const speak = vi.fn();
    vi.stubGlobal("speechSynthesis", { speak, cancel: vi.fn() });
    render(<JoinView model={mock("call", { endCall, callPreview: undefined })} />);
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(endCall).toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("lights the current word and shows the timer in the connected preview", () => {
    render(<JoinView model={mock("connected")} />);
    expect(screen.getByText("00:09")).toBeTruthy();
    const lit = screen.getByTestId("karaoke").querySelectorAll('[data-state="now"]');
    expect(lit).toHaveLength(1);
  });
});
