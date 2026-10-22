import type { Commitment, EventDetails, Person, State } from "@deadlock/shared/types";
import * as llm from "./llm";
import { emptyState, getState, replaceState, update, DEFAULT_ATTENDEE_TARGET } from "./state";
import { seedMessages, seedPeople, SEED_ATTENDING, HOST_ID, TRIGGER_TEXT } from "./seed";
import { solve, ATTENDEES } from "./solver";

// Demo orchestration: chat → detect/extract → solve → explain → cascade → book → invite/call.

const CASCADE_STEP_MS = Number(process.env.CASCADE_STEP_MS ?? 400);
const SIM_JOIN_MS = Number(process.env.SIM_JOIN_MS ?? 150);
const CALL_DELAY_MS = Number(process.env.CALL_DELAY_MS ?? 2500);

export const PHONE_COLORS = ["#9C8F7A", "#7D8B74", "#8C7A6B", "#6F8287", "#A08C5B", "#857A8F"];
const SIM_NAMES = ["Alex", "Jordan", "Sasha", "Robin", "Kai", "Noor", "Ellis", "Rafi", "Jess", "Ade",
  "Toby", "Mina", "Luca", "Zara", "Owen", "Isla", "Theo", "Ana", "Femi", "Cleo"];

export type Role = "attend" | "laptop" | "help";
export type Step = "detect" | "extract" | "explain" | "cascade" | "book" | "call";

export interface Emitter {
  toAll(event: string, payload?: unknown): void;
  toPerson(personId: string, event: string, payload?: unknown): void;
  isOnline(personId: string): boolean;
}

let emit: Emitter = { toAll() {}, toPerson() {}, isOnline: () => false };
export function bindEmitter(e: Emitter) {
  emit = e;
}

// Server-only bookkeeping, not broadcast. `epoch` bumps on reset/seed so
// timers and LLM calls from before it drop their results.
let epoch = 0;
let nextId = 1;
let rsvps = new Map<string, Role>();
let joinOrder: string[] = [];
let callTarget: string | null = null;
let callScript: string | null = null;
let forceAll = false;
let detecting = false;
let settling = false;
let resettle = false;
let booking = false;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const s = () => getState();

function seeded(base: State): State {
  return { ...base, people: [...seedPeople], messages: seedMessages() };
}

function clearPlan(st: State) {
  st.plan = null;
  st.commitments = [];
  st.blocking = [];
  st.explanation = "";
  st.event = null;
  st.attendeeTarget = DEFAULT_ATTENDEE_TARGET;
}

function clearRun() {
  epoch++;
  callScript = null;
  forceAll = false;
  detecting = settling = resettle = booking = false;
}

/** Everything back to the seeded chat, no phones. */
export function resetDemo() {
  clearRun();
  rsvps = new Map();
  joinOrder = [];
  callTarget = null;
  const next = seeded(emptyState(s().mock));
  recount(next);
  replaceState(next);
}

/** Re-seed the chat and drop the plan; joined phones stay. */
export function reseed() {
  clearRun();
  const phones = s().people.filter((p) => p.source === "phone");
  const next = seeded({ ...s() });
  next.people = [...seedPeople, ...phones];
  clearPlan(next);
  recount(next);
  replaceState(next);
}

function recount(st: State) {
  st.attendeeCount = SEED_ATTENDING + st.people.filter((p) => p.source === "phone").length;
}

function counts(): Record<string, number> {
  const out: Record<string, number> = { laptops: 0, helpers: 0 };
  for (const role of rsvps.values()) {
    if (role === "laptop") out.laptops++;
    if (role === "help") out.helpers++;
  }
  return out;
}

// ───────────── people ─────────────

export function join(name: string, personId?: string): Person {
  const existing = personId ? s().people.find((p) => p.id === personId && p.source === "phone") : undefined;
  if (existing) return existing; // reconnect: reattach, don't double count

  const person: Person = {
    id: `ph-${nextId++}`,
    name: name.trim().slice(0, 24) || "Guest",
    color: PHONE_COLORS[Math.floor(Math.random() * PHONE_COLORS.length)],
    source: "phone",
  };
  joinOrder.push(person.id);
  update((st) => {
    st.people.push(person);
    recount(st);
  });
  void settle();
  return person;
}

export function rsvp(personId: string, role: Role) {
  if (!s().people.some((p) => p.id === personId)) return;
  rsvps.set(personId, role);
  update();
  void settle();
}

export async function simulateJoins(count: number) {
  const my = epoch;
  for (let i = 0; i < count; i++) {
    if (SIM_JOIN_MS) await sleep(SIM_JOIN_MS);
    if (epoch !== my) return;
    join(SIM_NAMES[i % SIM_NAMES.length]);
  }
}

export function setCallTarget(personId: string) {
  callTarget = personId || null;
}

export function setMock(on: boolean) {
  update((st) => {
    st.mock = on;
  });
}

// ───────────── chat → plan ─────────────

export function chat(personId: string, text: string) {
  const clean = text.trim();
  if (!clean || !s().people.some((p) => p.id === personId)) return;
  update((st) => {
    st.messages.push({ id: `m-${nextId++}`, personId, text: clean, ts: Date.now() });
  });
  if (!s().plan) void detect();
}

async function detect(replaceCommitments = false) {
  if (detecting) return;
  detecting = true;
  const my = epoch;
  try {
    const { plan, commitments } = await llm.detectAndExtract(s().messages, s().people);
    if (epoch !== my || !plan) return;
    update((st) => {
      if (!st.plan) st.plan = { ...plan, status: "blocked" };
      if (!st.commitments.length || replaceCommitments) st.commitments = keepUnlocked(commitments, st.commitments);
      st.attendeeTarget = attendeeTarget(st.commitments);
    });
  } finally {
    if (epoch === my) detecting = false;
  }
  if (epoch !== my || !s().plan) return;
  await settle();
  await explain();
}

function keepUnlocked(next: Commitment[], prev: Commitment[]): Commitment[] {
  const unlocked = new Set(prev.filter((c) => c.status === "unlocked").map((c) => c.id));
  return next.map((c) => ({ ...c, status: unlocked.has(c.id) ? "unlocked" : "waiting" }));
}

function attendeeTarget(commitments: Commitment[]): number {
  const bars = commitments.flatMap((c) => c.requires).filter((r) => r.resource === ATTENDEES && r.minCount);
  return bars.length ? Math.max(...bars.map((r) => r.minCount!)) : DEFAULT_ATTENDEE_TARGET;
}

async function explain() {
  const my = epoch;
  if (!s().plan) return;
  update((st) => {
    st.explanation = "";
  });
  const text = await llm.explain(s(), (t) => {
    if (epoch === my) emit.toAll("explain:chunk", { text: t });
  });
  // A join can make the plan viable while this streams; don't show a stale "why".
  if (epoch !== my || s().plan?.status !== "blocked") return;
  update((st) => {
    st.explanation = text;
  });
}

// ───────────── solve → cascade → book ─────────────

/**
 * Re-run the solver and animate any newly unlocked commitments one at a
 * time. Calls that arrive mid-cascade just mark `resettle`; the running
 * loop picks them up, so joins during the animation are never lost.
 */
async function settle() {
  if (settling) {
    resettle = true;
    return;
  }
  settling = true;
  const my = epoch;
  try {
    do {
      resettle = false;
      const plan = s().plan;
      if (!plan || plan.status === "booked") return;

      const result = forceAll
        ? { order: s().commitments.map((c) => c.id), viable: true, blocking: [] }
        : solve({
            commitments: s().commitments,
            attendeeCount: s().attendeeCount,
            requiredForPlan: plan.requiredForPlan,
            attendeeTarget: s().attendeeTarget,
            counts: counts(),
          });

      update((st) => {
        st.blocking = result.blocking;
      });

      const fresh = result.order.filter((id) => s().commitments.find((c) => c.id === id)?.status !== "unlocked");
      if (fresh.length) {
        emit.toAll("cascade", { order: fresh });
        for (const id of fresh) {
          await sleep(CASCADE_STEP_MS);
          if (epoch !== my) return;
          update((st) => {
            const c = st.commitments.find((c) => c.id === id);
            if (c) c.status = "unlocked";
          });
        }
      }

      if (result.viable && s().plan?.status === "blocked") {
        update((st) => {
          if (st.plan) st.plan.status = "viable";
          st.explanation = ""; // nothing is stuck any more
        });
        await book();
        if (epoch !== my) return;
      }
    } while (resettle);
  } finally {
    if (epoch === my) settling = false;
  }
}

async function book() {
  if (booking || !s().plan || s().plan?.status === "booked") return;
  booking = true;
  const my = epoch;
  try {
    const result = await llm.book(s());
    if (epoch !== my) return;
    callScript = result.callScript;
    update((st) => {
      st.event = result.event;
      if (st.plan) st.plan.status = "booked";
    });
    emit.toAll("booked", result.event satisfies EventDetails);
    for (const p of s().people.filter((p) => p.source === "phone")) {
      emit.toPerson(p.id, "invite", { text: result.invites[p.id] ?? `${p.name}, you're in: ${result.event.title}, ${result.event.when}.` });
    }
  } finally {
    if (epoch === my) booking = false;
  }
  if (CALL_DELAY_MS) await sleep(CALL_DELAY_MS);
  if (epoch === my) call();
}

/** Admin pick if set, else the most recent phone that's still connected. */
function pickCallTarget(): string | null {
  if (callTarget && s().people.some((p) => p.id === callTarget)) return callTarget;
  return [...joinOrder].reverse().find((id) => emit.isOnline(id)) ?? null;
}

function call() {
  const target = pickCallTarget();
  if (target && callScript) emit.toPerson(target, "call", { script: callScript });
}

// ───────────── admin force-steps ─────────────

export async function step(name: Step) {
  switch (name) {
    case "detect":
      if (s().plan) return;
      if (!s().messages.some((m) => /\bwe should\b/i.test(m.text))) chat(HOST_ID, TRIGGER_TEXT);
      else await detect();
      return;
    case "extract":
      await detect(true);
      return;
    case "explain":
      await explain();
      return;
    case "cascade": {
      if (!s().plan) await step("detect");
      const short = s().attendeeTarget - s().attendeeCount;
      if (short > 0) await simulateJoins(short);
      forceAll = true;
      await settle();
      return;
    }
    case "book":
      if (!s().plan) await step("detect");
      if (s().plan?.status === "booked") return;
      await book();
      return;
    case "call":
      if (!callScript) await step("book");
      else call();
      return;
  }
}
