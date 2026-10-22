import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Commitment, Condition, EventDetails, Plan } from "@deadlock/shared/types";

// Only the network language boundary is substituted. Target inference, solving,
// joins, cascades, and booking all use the production flow and state.
vi.mock("./llm", () => ({ detectAndExtract: vi.fn(), explain: vi.fn(), book: vi.fn() }));
import * as llm from "./llm";

let flow: typeof import("./flow");
let store: typeof import("./state");
const trigger = "we should run a hands-on Grok agents workshop next week";
const event: EventDetails = {
  title: "Community workshop", when: "Thursday, 18:30", where: "The office",
  agenda: ["Setup", "Learn", "Build", "Demos"], blurb: "Build together.",
};

function offer(id: string, offers: string, requires: Condition[] = []): Commitment {
  return { id, personId: "p-priya", offers, requires, quote: `Offer ${id}`, status: "waiting" };
}
const attendees = (minCount: number): Condition => ({ resource: "attendees", minCount });

async function extract(commitments: Commitment[], requiredForPlan = ["venue", "speaker", "attendees"]) {
  const plan: Plan = { id: "workshop", title: event.title, status: "blocked", requiredForPlan };
  vi.mocked(llm.detectAndExtract).mockResolvedValue({ plan, commitments });
  flow.chat("p-host", trigger);
  await vi.runAllTimersAsync();
  return store.getState();
}

async function addPeople(count: number) {
  for (let i = 0; i < count; i++) flow.join(`Guest ${i + 1}`);
  await vi.runAllTimersAsync();
  return store.getState();
}

beforeAll(async () => {
  process.env.CASCADE_STEP_MS = "1";
  process.env.VIABLE_HOLD_MS = "1";
  process.env.CALL_DELAY_MS = "0";
  flow = await import("./flow");
  store = await import("./state");
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  flow.bindEmitter({ toAll() {}, toPerson() {}, isOnline: () => true });
  flow.resetDemo();
  flow.setMock(true);
  vi.mocked(llm.explain).mockResolvedValue("The remaining condition is still waiting.");
  vi.mocked(llm.book).mockResolvedValue({ event, invites: {}, callScript: "Your event is booked." });
});

afterEach(() => {
  flow.resetDemo();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("attendance target derived from required resources", () => {
  it("keeps the counter and explanation aligned below alternative venue thresholds", async () => {
    store.update((state) => { state.attendeeCount = 11; });
    vi.mocked(llm.explain).mockImplementation(async (state) => {
      const condition = state.blocking.find((condition) => condition.resource === "attendees");
      return `${(condition?.minCount ?? 1) - state.attendeeCount} more attendees unlock the venue.`;
    });
    const state = await extract([
      offer("venue-large", "venue", [attendees(15)]),
      offer("venue-small", "venue", [attendees(12)]),
      offer("speaker", "speaker", [{ resource: "venue" }]),
    ]);
    expect(state.attendeeTarget).toBe(12);
    expect(state.plan?.status).toBe("blocked");
    expect(state.blocking).toEqual([attendees(12)]);
    expect(state.explanation).toBe("1 more attendees unlock the venue.");
  });

  it("books at the cheaper alternative venue's 12-person threshold without mutating extraction", async () => {
    const commitments = [
      offer("venue-small", "venue", [attendees(12)]),
      offer("venue-large", "venue", [attendees(15)]),
      offer("speaker", "speaker", [{ resource: "venue" }]),
    ];
    const original = structuredClone(commitments);
    const state = await extract(commitments);

    expect(state.attendeeCount).toBe(12);
    expect(state.attendeeTarget).toBe(12);
    expect(state.plan?.status).toBe("booked");
    expect(state.commitments.find((c) => c.id === "venue-large")?.status).toBe("waiting");
    expect(commitments).toEqual(original);
  });

  it("ignores a 50-person optional food offer and books the seeded 15-person venue chain", async () => {
    const state = await extract([
      offer("venue", "venue", [attendees(15)]),
      offer("speaker", "speaker", [{ resource: "venue" }]),
      offer("food", "food", [attendees(50)]),
    ]);
    expect(state.attendeeTarget).toBe(15);
    expect(state.plan?.status).toBe("blocked");

    const joined = await addPeople(3);
    expect(joined.plan?.status).toBe("booked");
    expect(joined.commitments.find((c) => c.id === "food")?.status).toBe("waiting");
  });

  it("uses 20 when separate required branches need 15 and 20 attendees", async () => {
    const state = await extract([
      offer("venue", "venue", [attendees(15)]),
      offer("speaker", "speaker", [{ resource: "venue" }]),
      offer("equipment", "equipment", [attendees(20)]),
    ], ["venue", "speaker", "equipment", "attendees"]);
    expect(state.attendeeTarget).toBe(20);
    expect((await addPeople(7)).plan?.status).toBe("blocked");
    expect((await addPeople(1)).plan?.status).toBe("booked");
  });

  it("infers the attendance bar despite a missing external laptop root, without inventing viability", async () => {
    const state = await extract([
      offer("venue", "venue", [attendees(15), { resource: "laptops", minCount: 4 }]),
      offer("speaker", "speaker", [{ resource: "venue" }]),
    ]);
    expect(state.attendeeTarget).toBe(15);

    const joined = await addPeople(3);
    expect(joined.attendeeCount).toBe(15);
    expect(joined.plan?.status).toBe("blocked");
    expect(joined.event).toBeNull();
    expect(joined.blocking).toContainEqual({ resource: "laptops", minCount: 4 });
  });

  it("keeps a conservative relevant threshold when a required resource graph is impossible", async () => {
    const state = await extract([
      offer("venue", "venue", [attendees(15)]),
      offer("speaker", "speaker", [{ resource: "speaker" }]),
      offer("food", "food", [attendees(50)]),
    ]);
    expect(state.attendeeTarget).toBe(15);
    expect((await addPeople(3)).plan?.status).toBe("blocked");
  });

  it("retains the default bar when attendance conditions belong only to optional offers", async () => {
    const state = await extract([
      offer("venue", "venue"),
      offer("speaker", "speaker", [{ resource: "venue" }]),
      offer("food", "food", [attendees(50)]),
    ]);
    expect(state.attendeeTarget).toBe(15);
    expect(state.plan?.status).toBe("blocked");
    expect((await addPeople(3)).plan?.status).toBe("booked");
  });

  it("keeps at least one attendee when an explicit zero threshold leads to an attendees requirement", async () => {
    const state = await extract([
      offer("venue", "venue", [attendees(0)]),
      offer("speaker", "speaker", [{ resource: "venue" }]),
    ]);
    expect(state.attendeeTarget).toBe(1);
    expect(state.plan?.status).toBe("booked");
  });

  it("retains the default 15-person bar when there are no attendance conditions", async () => {
    const state = await extract([
      offer("venue", "venue"),
      offer("speaker", "speaker", [{ resource: "venue" }]),
    ]);
    expect(state.attendeeTarget).toBe(15);
    expect(state.plan?.status).toBe("blocked");
    expect((await addPeople(3)).plan?.status).toBe("booked");
  });
});
