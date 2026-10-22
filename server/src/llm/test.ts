import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// npm run llm:test            → live Grok (falls back to mocks per call)
// MOCK_LLM=true npm run llm:test → mocks only
// Runs every call against the seeded chat and prints results with timings.

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env"), quiet: true });

const { solve } = await import("../solver");
const { seedMessages, seedPeople, SEED_ATTENDING, HOST_ID, TRIGGER_TEXT } = await import("../seed");
const { emptyState } = await import("../state");
const llm = await import("./index");

const RUNS = Number(process.env.LLM_TEST_RUNS ?? 5);
const EXPECTED: [string, string, string][] = [
  // [personId, offers, required resource]
  ["p-sam", "speaker", "venue"],
  ["p-priya", "venue", "attendees"],
  ["p-dan", "food", "venue"],
];

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "PASS" : "FAIL"} ${what}`);
  if (!ok) failures++;
};
async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t = Date.now();
  const out = await fn();
  const ms = Date.now() - t;
  console.log(`  ${label}: ${ms}ms${ms > 4000 ? "  (over 4s)" : ""}`);
  return out;
}

console.log(`\nGrok ${llm.live() ? `LIVE (${process.env.GROK_MODEL})` : "MOCK"}\n`);

const messages = [...seedMessages(), { id: "m-trigger", personId: HOST_ID, text: TRIGGER_TEXT, ts: Date.now() }];

// ── A: full read, RUNS times ──
console.log(`A  detectAndExtract x${RUNS}`);
let extracted = await llm.detectAndExtract(messages, seedPeople);
for (let i = 1; i <= RUNS; i++) {
  const r = i === 1 ? extracted : await timed(`run ${i}`, () => llm.detectAndExtract(messages, seedPeople));
  if (i === 1) extracted = r;
  const got = EXPECTED.every(([p, o, req]) =>
    r.commitments.some((c) => c.personId === p && c.offers === o && c.requires.some((x) => x.resource === req)),
  );
  const quotesReal = r.commitments.every((c) => messages.some((m) => m.text.includes(c.quote)));
  check(Boolean(r.plan) && got && quotesReal, `run ${i}: plan + 3 chained commitments with exact quotes`);
}
console.log(`  plan: ${extracted.plan?.title}  needs: ${extracted.plan?.requiredForPlan.join(", ")}`);
for (const c of extracted.commitments) {
  console.log(`  - ${c.personId} offers ${c.offers} if ${JSON.stringify(c.requires)}  "${c.quote}"`);
}

// Build a state like the server would.
const state = emptyState(false);
state.people = [...seedPeople];
state.messages = messages;
state.plan = extracted.plan;
state.commitments = extracted.commitments;
state.attendeeCount = SEED_ATTENDING;
state.attendeeTarget = 15;
const solved = solve({
  commitments: state.commitments,
  attendeeCount: state.attendeeCount,
  requiredForPlan: state.plan?.requiredForPlan ?? [],
  attendeeTarget: 15,
});
state.blocking = solved.blocking;
console.log(`  solver: viable=${solved.viable} blocking=${JSON.stringify(solved.blocking)}`);

// ── B: explain (streamed) ──
console.log("\nB  explain");
let chunks = 0;
const why = await timed("explain", () => llm.explain(state, () => chunks++));
console.log(`  "${why}"  (${chunks} chunks)`);
check(why.length > 10, "explanation written");

// ── delta: a new conditional offer ──
console.log("\nDelta  extractDelta");
const newMsg = { id: "m-new", personId: "p-leah", text: "I'll bring a projector if someone sorts food", ts: Date.now() };
state.messages = [...messages, newMsg];
const delta = await timed("new offer", () => llm.extractDelta([newMsg], state));
console.log(`  upserts: ${delta.upserts.map((u) => `${u.personId} ${u.offers} if ${JSON.stringify(u.requires)}`).join("; ") || "none"}`);
if (llm.live()) check(delta.upserts.some((u) => u.offers === "projector"), "picked up Leah's projector");

// ── negotiate: stuck at 12/15 ──
console.log("\nAgent  negotiate");
const nego = await timed("negotiate", () => llm.negotiate(state));
if (nego.action === "ask") {
  const who = seedPeople.find((p) => p.id === nego.ask.personId)?.name;
  console.log(`  asks ${who}: "${nego.ask.question}"  → ${JSON.stringify(nego.ask.proposal.requires)}`);
  check(nego.ask.personId === "p-priya", "asks Priya (the headcount bottleneck)");
  const old = state.commitments.find((c) => c.id === nego.ask.proposal.commitmentId)?.requires ?? [];
  check(llm.loosens(old, nego.ask.proposal.requires), "proposal only loosens");

  // her answer
  state.asks = [{ ...nego.ask, id: "ask-1", status: "open" }];
  const reply = { id: "m-reply", personId: nego.ask.personId, text: "yeah 12 is fine tbh", ts: Date.now() };
  const answer = await timed("answer", () => llm.extractDelta([reply], state));
  check(answer.askReply?.accept === true, `"${reply.text}" read as yes`);
} else {
  check(false, `negotiate returned wait: ${nego.reason}`);
}

// ── C: book ──
console.log("\nC  book");
state.people.push({ id: "ph-1", name: "Ada", color: "#9C8F7A", source: "phone" });
state.plan = state.plan && { ...state.plan, status: "viable" };
const booked = await timed("book", () => llm.book(state));
console.log(`  ${booked.event.title} | ${booked.event.when} | ${booked.event.where}`);
for (const a of booked.event.agenda) console.log(`   · ${a}`);
console.log(`  blurb: ${booked.event.blurb}`);
console.log(`  invite ph-1: ${booked.invites["ph-1"] ?? "(default)"}`);
console.log(`  call: ${booked.callScript}`);
check(booked.event.agenda.length === 4 && Boolean(booked.callScript), "event with 4-item agenda + call script");

console.log(`\n${failures ? `${failures} FAILED` : "ALL PASSED"}\n`);
process.exit(failures ? 1 : 0);
