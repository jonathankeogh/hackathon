import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Commitment, EventDetails, Message, Plan } from "@deadlock/shared/types";

// The LLM is the asynchronous network boundary. The real flow, solver, state,
// and emitted invite/call behavior run unchanged in these tests.
vi.mock("./llm", () => ({
  detectAndExtract: vi.fn(),
  explain: vi.fn(),
  book: vi.fn(),
}));

import * as llm from "./llm";

type Extraction = { plan: Plan | null; commitments: Commitment[] };
type Flow = typeof import("./flow");
type Store = typeof import("./state");
let flow: Flow;
let store: Store;
let sent: { personId: string; event: string; payload: unknown }[];

const TRIGGER = "we should run a hands-on Grok agents workshop next week";
const EVENT: EventDetails = {
  title: "Hands-on Grok agents workshop",
  when: "Thu 29 Oct, 18:30",
  where: "Priya's office, Shoreditch",
  agenda: ["Setup", "Tool calls", "Build", "Demos"],
  blurb: "Build an agent with the community.",
};

function extraction(title = "Hands-on Grok agents workshop"): Extraction {
  return {
    plan: { id: "workshop", title, status: "blocked", requiredForPlan: ["venue", "speaker", "attendees"] },
    commitments: [
      { id: "venue", personId: "p-priya", offers: "venue", requires: [{ resource: "attendees", minCount: 15 }], quote: "I can host if 15+ people actually commit", status: "waiting" },
      { id: "speaker", personId: "p-sam", offers: "speaker", requires: [{ resource: "venue" }], quote: "I'll teach it if we sort a venue", status: "waiting" },
    ],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function flush() {
  await vi.runAllTimersAsync();
}

beforeAll(async () => {
  process.env.CASCADE_STEP_MS = "1";
  process.env.SIM_JOIN_MS = "0";
  process.env.CALL_DELAY_MS = "0";
  process.env.REEXPLAIN_MS = "600";
  flow = await import("./flow");
  store = await import("./state");
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  sent = [];
  flow.bindEmitter({
    toAll() {},
    toPerson: (personId, event, payload) => sent.push({ personId, event, payload }),
    isOnline: () => true,
  });
  flow.resetDemo();
  flow.setMock(true);
  vi.mocked(llm.detectAndExtract).mockImplementation(async (messages: Message[]) =>
    messages.some((message) => message.text === TRIGGER) ? extraction() : { plan: null, commitments: [] });
  vi.mocked(llm.explain).mockResolvedValue("Three more attendees unlock the office, then the speaker.");
  vi.mocked(llm.book).mockResolvedValue({ event: EVENT, invites: {}, callScript: "The workshop is booked. Bring your laptop." });
});

afterEach(() => {
  // Invalidate any intentionally delayed request before the next test.
  flow.resetDemo();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("asynchronous demo orchestration", () => {
  it("detects a newer trigger that arrived while an older non-trigger request was pending", async () => {
    const pending = deferred<Extraction>();
    vi.mocked(llm.detectAndExtract).mockImplementationOnce(() => pending.promise);

    flow.chat("p-host", "Has anyone tried the new tool calling examples?");
    flow.chat("p-host", TRIGGER);
    pending.resolve({ plan: null, commitments: [] });
    await flush();

    expect(store.getState().plan?.title).toBe("Hands-on Grok agents workshop");
    expect(store.getState().blocking).toEqual([{ resource: "attendees", minCount: 15 }]);
  });

  it.each(["book", "cascade", "call"] as const)(
    "keeps force-%s pending until detection finishes, then completes the requested action",
    async (step) => {
      const phone = flow.join("Ada");
      flow.setCallTarget(phone.id);
      const pending = deferred<Extraction>();
      vi.mocked(llm.detectAndExtract).mockImplementationOnce(() => pending.promise);

      let returned = false;
      const command = flow.step(step).then(() => { returned = true; });
      await flush();
      const returnedBeforeDetection = returned;
      pending.resolve(extraction());
      await flush();
      await command;

      expect(returnedBeforeDetection).toBe(false);
      expect(store.getState().plan?.status).toBe("booked");
      expect(store.getState().event?.title).toBe("Hands-on Grok agents workshop");
      expect(sent.some((message) => message.personId === phone.id && message.event === "invite")).toBe(true);
      expect(sent.some((message) => message.personId === phone.id && message.event === "call")).toBe(true);
      if (step === "cascade") {
        expect(store.getState().attendeeCount).toBe(15);
        expect(store.getState().commitments.every((commitment) => commitment.status === "unlocked")).toBe(true);
      }
    },
  );

  it("discards a detection response that completes after reset", async () => {
    const pending = deferred<Extraction>();
    vi.mocked(llm.detectAndExtract).mockImplementationOnce(() => pending.promise);

    flow.chat("p-host", TRIGGER);
    flow.resetDemo();
    pending.resolve(extraction());
    await flush();

    expect(store.getState().plan).toBeNull();
    expect(store.getState().commitments).toEqual([]);
    expect(store.getState().event).toBeNull();
    expect(store.getState().messages.some((message) => message.text === TRIGGER)).toBe(false);
    expect(sent).toEqual([]);
  });

  it("uses the runtime mock switch for the next detection request", async () => {
    // Distinct network responses make a dropped mode argument visible through
    // the actual plan; this does not merely inspect a mock's call history.
    vi.mocked(llm.detectAndExtract).mockImplementation(async (_messages, _people, mock?: boolean) =>
      extraction(mock ? "Mock workshop" : "Live workshop"));

    flow.setMock(true);
    flow.chat("p-host", TRIGGER);
    await flush();
    expect(store.getState().plan?.title).toBe("Mock workshop");

    flow.reseed();
    flow.setMock(false);
    flow.chat("p-host", TRIGGER);
    await flush();
    expect(store.getState().plan?.title).toBe("Live workshop");
  });
});
