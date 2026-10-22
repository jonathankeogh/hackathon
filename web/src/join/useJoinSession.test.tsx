import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { handlers, socket, snapshot } = vi.hoisted(() => {
  const handlers = new Map<string, (p?: unknown) => void>();
  const socket = {
    connected: true,
    on: (e: string, fn: (p?: unknown) => void) => void handlers.set(e, fn),
    off: (e: string) => void handlers.delete(e),
    emit: vi.fn(),
  };
  return { handlers, socket, snapshot: { state: null as unknown, connected: true, streamed: "" } };
});
vi.mock("../socket", () => ({ socket, subscribe: () => () => undefined, getSnapshot: () => snapshot }));

import { useJoinSession } from "./useJoinSession";

beforeEach(() => {
  localStorage.clear();
  handlers.clear();
  socket.emit.mockClear();
  vi.stubGlobal("navigator", { ...navigator, vibrate: vi.fn(), userActivation: { hasBeenActive: true } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useJoinSession", () => {
  it("rejoins silently with the saved person id and skips the join screen", () => {
    localStorage.setItem("deadlock.phone", JSON.stringify({ personId: "ph-7", name: "Ada" }));
    const { result } = renderHook(() => useJoinSession());
    expect(socket.emit).toHaveBeenCalledWith("join", { name: "Ada", personId: "ph-7" });
    expect(result.current.screen).toBe("rsvp");
  });

  it("joins by name, stores the id from joined, and remembers the RSVP", () => {
    const { result } = renderHook(() => useJoinSession());
    expect(result.current.screen).toBe("join");
    act(() => result.current.join(" Ada "));
    expect(socket.emit).toHaveBeenCalledWith("join", { name: "Ada" });
    act(() => handlers.get("joined")!({ personId: "ph-1" }));
    expect(JSON.parse(localStorage.getItem("deadlock.phone")!)).toMatchObject({ personId: "ph-1", name: "Ada" });
    act(() => result.current.chooseRole("laptop"));
    expect(socket.emit).toHaveBeenCalledWith("rsvp", { personId: "ph-1", role: "laptop" });
    expect(result.current.screen).toBe("waiting");
  });

  it("buzzes [80, 40, 80] on invite and shows the call on call", () => {
    localStorage.setItem("deadlock.phone", JSON.stringify({ personId: "ph-7", name: "Ada", role: "help" }));
    const { result } = renderHook(() => useJoinSession());
    act(() => handlers.get("invite")!({ text: "You're in" }));
    expect(navigator.vibrate).toHaveBeenCalledWith([80, 40, 80]);
    expect(result.current.screen).toBe("invite");
    act(() => handlers.get("call")!({ script: "hello" }));
    expect(result.current.screen).toBe("call");
    act(() => result.current.endCall());
    expect(result.current.screen).toBe("invite");
  });

  describe("plan ideas", () => {
    const sug = (id: string, status: "open" | "picked" = "open") => ({
      id,
      topic: "Premier League",
      people: [] as string[],
      area: null,
      status,
      options: [{ id: "live" as const, title: "T", detail: "D", plan: "P", votes: [] }],
    });
    const setSuggestion = (suggestion: ReturnType<typeof sug> | null) => {
      snapshot.state = { people: [{ id: "ph-7", name: "Ada", color: "", source: "phone" }], plan: null, suggestion, asks: [] };
    };
    const joinedAda = () => localStorage.setItem("deadlock.phone", JSON.stringify({ personId: "ph-7", name: "Ada", role: "help" }));
    afterEach(() => {
      snapshot.state = null;
    });

    it("shows the screen and emits suggest:vote with the person id and option", () => {
      joinedAda();
      setSuggestion(sug("s1"));
      const { result } = renderHook(() => useJoinSession());
      expect(result.current.screen).toBe("suggest");
      act(() => result.current.voteSuggestion("live"));
      expect(socket.emit).toHaveBeenCalledWith("suggest:vote", { personId: "ph-7", option: "live" });
    });

    it("buzzes [120, 80, 120] once per suggestion id", () => {
      joinedAda();
      setSuggestion(sug("s1"));
      const { rerender } = renderHook(() => useJoinSession());
      const buzzes = () => (navigator.vibrate as ReturnType<typeof vi.fn>).mock.calls.filter(([p]) => Array.isArray(p) && p[0] === 120).length;
      expect(buzzes()).toBe(1);
      rerender();
      expect(buzzes()).toBe(1);
      setSuggestion({ ...sug("s1"), people: ["x"] });
      rerender();
      expect(buzzes()).toBe(1);
      setSuggestion(sug("s2"));
      rerender();
      expect(buzzes()).toBe(2);
    });

    it("does not buzz for a picked suggestion", () => {
      joinedAda();
      setSuggestion(sug("s1", "picked"));
      renderHook(() => useJoinSession());
      expect(navigator.vibrate).not.toHaveBeenCalled();
    });
  });

  it("sends chat with the person id", () => {
    localStorage.setItem("deadlock.phone", JSON.stringify({ personId: "ph-7", name: "Ada", role: "help" }));
    const { result } = renderHook(() => useJoinSession());
    act(() => result.current.sendChat(" hi "));
    expect(socket.emit).toHaveBeenCalledWith("chat:send", { personId: "ph-7", text: "hi" });
  });
});
