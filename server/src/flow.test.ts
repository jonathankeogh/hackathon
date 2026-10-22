import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import type { EventDetails, State } from "@deadlock/shared/types";

// Full demo over real sockets on the LLM stubs: no network needed.

process.env.CASCADE_STEP_MS = "20";
process.env.EXPLAIN_CHUNK_MS = "0";
process.env.SIM_JOIN_MS = "0";
process.env.CALL_DELAY_MS = "0";
process.env.REEXPLAIN_MS = "10";
process.env.VIABLE_HOLD_MS = "0";
// Offline: weather and routes use their samples and estimates, never the network.
process.env.MOCK_LLM = "true";

let server: { port: number; close: () => Promise<void> };
const sockets: Socket[] = [];

function client() {
  const s = connect(`http://localhost:${server.port}`, { transports: ["websocket"], forceNew: true });
  sockets.push(s);
  let latest: State | null = null;
  s.on("state", (st: State) => (latest = st));
  return { s, state: () => latest };
}

type Client = ReturnType<typeof client>;

/** Resolves with the latest snapshot if it already matches, else waits for one that does. */
function waitState(c: Client, until: (st: State) => boolean, ms = 3000): Promise<State> {
  const now = c.state();
  return now && until(now) ? Promise.resolve(now) : next<State>(c.s, "state", until, ms);
}

function next<T>(s: Socket, event: string, until: (p: T) => boolean = () => true, ms = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), ms);
    const on = (p: T) => {
      if (!until(p)) return;
      clearTimeout(t);
      s.off(event, on);
      resolve(p);
    };
    s.on(event, on);
  });
}

beforeAll(async () => {
  const { startServer } = await import("./app");
  server = await startServer(0);
});

afterAll(async () => {
  sockets.forEach((s) => s.close());
  await server.close();
});

describe("demo flow on stubs", () => {
  it("runs end to end: seed → join → plan → explain → cascade → book → invite → call → reset", async () => {
    const stage = client();
    const first = await waitState(stage, () => true);
    expect(first.messages.length).toBeGreaterThanOrEqual(8);
    expect(first.attendeeCount).toBe(12);
    expect(first.plan).toBeNull();

    // A phone joins: the stage count goes up.
    const phone = client();
    await next(phone.s, "connect");
    phone.s.emit("join", { name: "Ada" });
    const { personId } = await next<{ personId: string }>(phone.s, "joined");
    await waitState(stage, (st) => st.attendeeCount === 13);

    // Reconnecting with the saved id reattaches instead of double counting.
    phone.s.disconnect().connect();
    await next(phone.s, "connect");
    phone.s.emit("join", { name: "Ada", personId });
    expect((await next<{ personId: string }>(phone.s, "joined")).personId).toBe(personId);
    phone.s.emit("rsvp", { personId, role: "laptop" });
    await new Promise((r) => setTimeout(r, 50));
    expect(stage.state()?.attendeeCount).toBe(13);

    // Presenter's message → plan blocked on attendance, explanation streams in.
    const chunks: string[] = [];
    stage.s.on("explain:chunk", (p: { text: string }) => chunks.push(p.text));
    const admin = client();
    await next(admin.s, "connect");
    admin.s.emit("chat:send", { personId: "p-host", text: "we should run a hands-on Grok agents workshop next week" });
    const blocked = await waitState(stage, (st) => st.plan?.status === "blocked" && st.explanation !== "");
    expect(blocked.commitments.map((c) => c.offers)).toEqual(["venue", "speaker", "food"]);
    expect(blocked.blocking).toEqual([{ resource: "attendees", minCount: 15 }]);
    expect(blocked.attendeeTarget).toBe(15);
    expect(blocked.explanation).toContain("2 more people");

    // The explanation follows the count as people join.
    admin.s.emit("admin:simulateJoins", { count: 1 });
    await waitState(stage, (st) => st.explanation.includes("1 more person"));
    expect(chunks.join("")).toBe(blocked.explanation);
    for (const c of blocked.commitments) expect(blocked.messages.some((m) => m.text.includes(c.quote))).toBe(true);

    // Two more joins hit the threshold: cascade in chain order, then booked.
    const cascade = next<{ order: string[] }>(stage.s, "cascade");
    const booked = next<EventDetails>(stage.s, "booked");
    const invite = next<{ text: string }>(phone.s, "invite");
    const call = next<{ script: string }>(phone.s, "call");
    admin.s.emit("admin:simulateJoins", { count: 1 });
    expect((await cascade).order).toEqual(["c-venue", "c-speaker", "c-food"]);
    const event = await booked;
    expect(event.agenda).toHaveLength(4);
    // Practical extras read from the chat, plus things to do in the area.
    expect(event.extras?.area).toBe("Shoreditch");
    expect(event.extras?.tips.some((t) => t.kind === "bring" && t.label === "Laptop")).toBe(true);
    expect(event.extras?.nearby.length).toBeGreaterThan(0);
    expect((await invite).text).toContain("Ada");
    expect((await call).script.length).toBeGreaterThan(20);

    // A phone that joins after booking still gets its invite.
    const late = client();
    await next(late.s, "connect");
    const lateInvite = next<{ text: string }>(late.s, "invite");
    late.s.emit("join", { name: "Late" });
    expect((await lateInvite).text).toContain("Late");
    const done = stage.state()!;
    expect(done.plan?.status).toBe("booked");
    expect(done.commitments.every((c) => c.status === "unlocked")).toBe(true);
    expect(done.attendeeCount).toBe(16);
    expect(done.explanation).toBe("");

    // Offline: the sample forecast and estimated routes in from around London and nearby cities.
    const enriched = await waitState(stage, (st) => !!st.event?.extras?.weather);
    expect(enriched.event?.extras?.weather?.source).toBe("sample");
    expect(enriched.event?.extras?.tips.some((t) => t.label === "Umbrella")).toBe(true);
    expect(enriched.event?.extras?.routes?.map((r) => r.from)).toContain("North London");
    expect(enriched.event?.extras?.routes?.every((r) => !r.live)).toBe(true);

    // Chat after booking updates the tips, and keeps the forecast.
    admin.s.emit("chat:send", { personId: "p-maya", text: "meet at reception on the 3rd floor" });
    const met = await waitState(stage, (st) => !!st.event?.extras?.tips.some((t) => t.kind === "meetingPoint" && t.personId === "p-maya"));
    expect(met.event?.extras?.weather?.source).toBe("sample");

    // Reset puts everything back to the seeded chat.
    admin.s.emit("admin:reset");
    const reset = await waitState(stage, (st) => st.plan === null);
    expect(reset.attendeeCount).toBe(12);
    expect(reset.people.some((p) => p.source === "phone")).toBe(false);
  });

  it("admin force-steps run the whole demo without anyone joining", async () => {
    const admin = client();
    await next(admin.s, "connect");
    admin.s.emit("admin:reset");
    await waitState(admin, (st) => st.plan === null);

    admin.s.emit("admin:step", { step: "detect" });
    await waitState(admin, (st) => st.plan?.status === "blocked");
    const booked = next<EventDetails>(admin.s, "booked");
    admin.s.emit("admin:step", { step: "cascade" });
    await booked;
    expect(admin.state()?.plan?.status).toBe("booked");
    expect(admin.state()?.attendeeCount).toBe(15);
  });
});
