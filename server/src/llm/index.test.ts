import http from "node:http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { State } from "@deadlock/shared/types";
import { seedMessages, seedPeople, TRIGGER_TEXT } from "../seed";

// Exercise the real SDK against a local responder. Only the outbound fetch is
// redirected; production has no alternate endpoint or testing flags.
const nativeFetch = globalThis.fetch;
const messages = () => [...seedMessages(), { id: "m-trigger", personId: "p-host", text: TRIGGER_TEXT, ts: Date.now() }];
const liveExtraction = () => ({
  plan: { title: "Live Grok workshop", triggerMessageId: "m-trigger" },
  commitments: [
    { personId: "p-priya", offers: "venue", requires: [{ resource: "attendees", minCount: 15 }], quote: seedMessages().find((m) => m.id === "m6")!.text },
    { personId: "p-sam", offers: "speaker", requires: [{ resource: "venue" }], quote: seedMessages().find((m) => m.id === "m5")!.text },
    { personId: "p-dan", offers: "food", requires: [{ resource: "venue" }], quote: seedMessages().find((m) => m.id === "m7")!.text },
  ],
  requiredForPlan: ["speaker", "venue", "attendees"],
});

function state(mock = false): State {
  return {
    people: [...seedPeople, { id: "ph-ada", name: "Ada", color: "#EDEAE2", source: "phone" }],
    messages: messages(),
    plan: { id: "plan-1", title: "Hands-on Grok agents workshop", status: "blocked", requiredForPlan: ["speaker", "venue", "attendees"] },
    commitments: [
      { id: "c-venue", ...liveExtraction().commitments[0], status: "waiting" },
      { id: "c-speaker", ...liveExtraction().commitments[1], status: "waiting" },
      { id: "c-food", ...liveExtraction().commitments[2], status: "waiting" },
    ],
    attendeeCount: 13, attendeeTarget: 15,
    blocking: [{ resource: "attendees", minCount: 15 }],
    explanation: "", event: null, mock,
  };
}

const liveBooking = () => ({
  event: {
    title: "Live booking", when: "Thu 29 Oct, 18:30", where: "Priya's office, Shoreditch",
    agenda: ["Setup", "Grok API", "Build", "Demos"], blurb: "A hands-on evening with Sam.",
  },
  invites: [{ personId: "ph-ada", text: "Ada, your live invitation is ready." }],
  callScript: "Hello Ada, Deadlock here. The workshop is confirmed for Thursday at half six.",
});

type Reply = { content?: unknown; refusal?: string; delay?: number; status?: number; hang?: boolean };
let server: http.Server;
let endpoint: string;
let llm: typeof import("./index");
let replies: Reply[] = [];
let requests: { url: string; body: Record<string, unknown>; authorization: string | undefined }[] = [];

beforeAll(async () => {
  server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    requests.push({ url: req.url ?? "", body: JSON.parse(raw), authorization: req.headers.authorization });
    const reply = replies.shift() ?? { status: 500 };
    if (reply.hang) return;
    const send = () => {
      res.writeHead(reply.status ?? 200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        id: "chatcmpl-local", object: "chat.completion", created: 1, model: "test-grok-model",
        choices: [{ index: 0, finish_reason: "stop", message: {
          role: "assistant", refusal: reply.refusal ?? null,
          content: typeof reply.content === "string" ? reply.content : JSON.stringify(reply.content ?? {}),
        } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      }));
    };
    if (reply.delay) {
      const timer = setTimeout(send, reply.delay);
      res.on("close", () => clearTimeout(timer));
    } else send();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  endpoint = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  process.env.EXPLAIN_CHUNK_MS = "0";
  llm = await import("./index");
});

beforeEach(() => {
  replies = [];
  requests = [];
  vi.stubEnv("XAI_API_KEY", "local-fake-secret");
  vi.stubEnv("GROK_MODEL", "test-grok-model");
  vi.stubEnv("MOCK_LLM", "false");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.startsWith("https://api.x.ai/v1/")) throw new Error("Unexpected external URL in test");
    return nativeFetch(url.replace("https://api.x.ai", endpoint), init);
  });
});

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Grok adapter", () => {
  it("uses the configured model, structured schema and actual chat, returning validated live extraction", async () => {
    replies.push({ content: liveExtraction() });
    const result = await llm.detectAndExtract(messages(), seedPeople, false);
    expect(result.plan?.title).toBe("Live Grok workshop");
    expect(result.commitments.map((c) => c.id)).toEqual(["c-venue", "c-speaker", "c-food"]);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("/v1/chat/completions");
    expect(requests[0].authorization).toBe("Bearer local-fake-secret");
    expect(requests[0].body.model).toBe("test-grok-model");
    expect(requests[0].body.response_format).toMatchObject({ type: "json_schema", json_schema: { strict: true } });
    expect(JSON.stringify(requests[0].body.messages)).toContain(TRIGGER_TEXT);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("live success"));
  });

  it("retries malformed JSON once and uses the repaired live response", async () => {
    replies.push({ content: "{broken" }, { content: liveExtraction() });
    expect((await llm.detectAndExtract(messages(), seedPeople, false)).plan?.title).toBe("Live Grok workshop");
    expect(requests).toHaveLength(2);
  });

  it.each([
    ["an unknown person", () => { const value = liveExtraction(); value.commitments[0].personId = "p-invented"; return value; }],
    ["a fabricated quote", () => { const value = liveExtraction(); value.commitments[0].quote = "I unconditionally host everyone"; return value; }],
    ["an unknown trigger", () => { const value = liveExtraction(); value.plan.triggerMessageId = "missing"; return value; }],
    ["a negative threshold", () => { const value = liveExtraction(); value.commitments[0].requires = [{ resource: "attendees", minCount: -1 }]; return value; }],
    ["a threshold contradicting the quoted 15-person minimum", () => { const value = liveExtraction(); value.commitments[0].requires = [{ resource: "attendees", minCount: 12 }]; return value; }],
    ["an omitted quoted minimum", () => { const value = liveExtraction(); value.commitments[0].requires = [{ resource: "attendees" }]; return value; }],
  ])("rejects %s twice and uses seeded fallback without poisoning the graph", async (_name, invalid) => {
    replies.push({ content: invalid() }, { content: invalid() });
    const result = await llm.detectAndExtract(messages(), seedPeople, false);
    expect(result.plan?.title).toBe("Hands-on Grok agents workshop");
    expect(result.commitments.map((c) => c.id)).toEqual(["c-venue", "c-speaker", "c-food"]);
    expect(result.commitments[0].requires).toEqual([{ resource: "attendees", minCount: 15 }]);
    expect(requests).toHaveLength(2);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("fallback"));
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("local-fake-secret");
  });

  it("handles refusals without treating a refused completion as live success", async () => {
    replies.push({ refusal: "Cannot answer" });
    expect((await llm.detectAndExtract(messages(), seedPeople, false)).commitments).toHaveLength(3);
    expect(requests).toHaveLength(1);
    expect(console.info).not.toHaveBeenCalledWith(expect.stringContaining("live success"));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("refused"));
  });

  it("falls back immediately on an API error instead of allowing SDK retries to exceed the deadline", async () => {
    replies.push({ status: 503 });
    expect((await llm.detectAndExtract(messages(), seedPeople, false)).plan?.status).toBe("blocked");
    expect(requests).toHaveLength(1);
  });

  it("shares one eight-second deadline across the invalid-JSON retry", async () => {
    replies.push({ content: "not JSON", delay: 1000 }, { hang: true });
    const started = Date.now();
    const result = await llm.detectAndExtract(messages(), seedPeople, false);
    expect(result.commitments).toHaveLength(3);
    expect(requests).toHaveLength(2);
    expect(Date.now() - started).toBeGreaterThanOrEqual(7500);
    expect(Date.now() - started).toBeLessThan(9500);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("timeout"));
  }, 12_000);

  it("mock mode makes zero network requests and returns fresh seeded objects", async () => {
    const first = await llm.detectAndExtract(messages(), seedPeople, true);
    first.commitments[0].requires[0].minCount = 999;
    const second = await llm.detectAndExtract(messages(), seedPeople, true);
    expect(second.commitments[0].requires).toEqual([{ resource: "attendees", minCount: 15 }]);
    expect(requests).toHaveLength(0);
  });

  it.each(["XAI_API_KEY", "GROK_MODEL"])("missing %s produces truthful fallback with zero network", async (name) => {
    vi.stubEnv(name, "");
    expect((await llm.detectAndExtract(messages(), seedPeople, false)).plan?.title).toBe("Hands-on Grok agents workshop");
    expect(requests).toHaveLength(0);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(name));
  });

  it("does not invent a plan or people when fallback receives an unrelated chat", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    const unrelated = [{ id: "different", personId: "p-host", text: "See you tomorrow", ts: 1 }];
    expect(await llm.detectAndExtract(unrelated, seedPeople, false)).toEqual({ plan: null, commitments: [] });
  });

  it("validates live explanation JSON then emits only its human words in order", async () => {
    replies.push({ content: { explanation: "Two more people unlock Priya's office, then Sam can teach." } });
    const chunks: string[] = [];
    const result = await llm.explain(state(), (chunk) => chunks.push(chunk));
    expect(result).toBe("Two more people unlock Priya's office, then Sam can teach.");
    expect(chunks.join("")).toBe(result);
    expect(chunks.length).toBeGreaterThan(3);
    expect(requests).toHaveLength(1);
  });

  it("mock explanation reflects the current solver shortfall without using the network", async () => {
    const current = state(true);
    current.attendeeCount = 14;
    const result = await llm.explain(current, () => {});
    expect(result).toContain("1 more person");
    expect(requests).toHaveLength(0);
  });

  it("rejects an empty human explanation instead of streaming whitespace as live success", async () => {
    replies.push({ content: { explanation: "   " } }, { content: { explanation: "   " } });
    const result = await llm.explain(state(), () => {});
    expect(result).toContain("2 more people");
    expect(requests).toHaveLength(2);
  });

  it("returns a validated live four-item event, personal invitation and two-sentence call", async () => {
    replies.push({ content: liveBooking() });
    const result = await llm.book(state());
    expect(result.event.title).toBe("Live booking");
    expect(result.event.agenda).toHaveLength(4);
    expect(result.invites).toEqual({ "ph-ada": "Ada, your live invitation is ready." });
    expect(result.callScript).toBe("Hello Ada, Deadlock here. The workshop is confirmed for Thursday at half six.");
    expect(requests).toHaveLength(1);
  });

  it("rejects incomplete booking invitations and falls back with every joined phone included", async () => {
    replies.push({ content: { ...liveBooking(), invites: [] } }, { content: { ...liveBooking(), invites: [] } });
    const result = await llm.book(state());
    expect(result.event.title).toBe("Hands-on Grok agents workshop");
    expect(result.invites["ph-ada"]).toContain("Ada");
    expect(requests).toHaveLength(2);
  });

  it("rejects a call script longer than the promised two spoken sentences", async () => {
    replies.push(
      { content: { ...liveBooking(), callScript: "Hello Ada. The workshop is booked. Bring a laptop." } },
      { content: { ...liveBooking(), callScript: "Hello Ada. The workshop is booked. Bring a laptop." } },
    );
    const result = await llm.book(state());
    expect(result.event.title).toBe("Hands-on Grok agents workshop");
    expect([...new Intl.Segmenter("en", { granularity: "sentence" }).segment(result.callScript)]).toHaveLength(2);
    expect(requests).toHaveLength(2);
  });

  it("mock booking is network-free and cannot mutate later fallback results", async () => {
    const first = await llm.book(state(true));
    first.event.agenda[0] = "poisoned";
    const second = await llm.book(state(true));
    expect(second.event.agenda[0]).toBe("18:30 Pizza and setup");
    expect(second.invites["ph-ada"]).toContain("Ada");
    expect(requests).toHaveLength(0);
  });
});
