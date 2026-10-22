import { beforeEach, expect, it, vi } from "vitest";
import type { State } from "@deadlock/shared/types";

const { handlers } = vi.hoisted(() => ({ handlers: new Map<string, (value: unknown) => void>() }));
vi.mock("socket.io-client", () => ({
  io: () => ({ connected: true, on: (event: string, handler: (value: unknown) => void) => handlers.set(event, handler) }),
}));

const blocked = (count = 12): State => ({
  people: [], messages: [], commitments: [],
  plan: { id: "workshop", title: "Grok workshop", status: "blocked", requiredForPlan: ["venue"] },
  attendeeCount: count, attendeeTarget: 15, blocking: [{ resource: "attendees", minCount: 15 }],
  explanation: "", event: null, mock: true,
});

beforeEach(() => { vi.resetModules(); handlers.clear(); });

it("preserves the beginning of a streamed explanation when an audience count snapshot arrives", async () => {
  const { getSnapshot } = await import("./socket");
  handlers.get("state")!(blocked());
  handlers.get("explain:chunk")!({ text: "Everything hinges on " });
  handlers.get("state")!(blocked(13));
  handlers.get("explain:chunk")!({ text: "attendance." });
  expect(getSnapshot().streamed).toBe("Everything hinges on attendance.");
});

it("clears streamed words after reset so they cannot appear under a new plan", async () => {
  const { getSnapshot } = await import("./socket");
  handlers.get("state")!(blocked());
  handlers.get("explain:chunk")!({ text: "Old plan" });
  handlers.get("state")!({ ...blocked(), plan: null });
  expect(getSnapshot().streamed).toBe("");
});

it("starts a fresh sentence when admin restarts an explanation before the previous stream finishes", async () => {
  const { getSnapshot } = await import("./socket");
  handlers.get("state")!(blocked());
  handlers.get("explain:chunk")!({ text: "Everything hinges " });
  handlers.get("state")!(blocked());
  handlers.get("explain:chunk")!({ text: "", reset: true });
  handlers.get("explain:chunk")!({ text: "Three more people" });
  expect(getSnapshot().streamed).toBe("Three more people");
});

it("uses the final explanation and clears its buffer before an explicit re-explanation", async () => {
  const { getSnapshot } = await import("./socket");
  handlers.get("state")!(blocked());
  handlers.get("explain:chunk")!({ text: "Three more people" });
  handlers.get("state")!({ ...blocked(), explanation: "Three more people" });
  handlers.get("state")!(blocked(14));
  handlers.get("explain:chunk")!({ text: "One more person" });
  expect(getSnapshot().streamed).toBe("One more person");
});
