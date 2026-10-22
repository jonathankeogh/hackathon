import type { Ask, Commitment, EventDetails, LineStatus, MeetExtras, Message, Notice, Person, PlanOption, State, Suggestion, TravelRoute, WeatherInfo } from "@deadlock/shared/types";
import * as llm from "./llm";
import { emptyState, getState, replaceState, update, DEFAULT_ATTENDEE_TARGET } from "./state";
import { seedMessagesFor, seedPeople, SEED_ATTENDING, HOST_ID, TRIGGER_TEXT, type Scenario } from "./seed";
import { buildOptions, findQuorum, parseVote, suggestionText, TOPICS } from "./suggest";
import { nextFixtures, pickFixture } from "./fixtures";
import { solve, ATTENDEES } from "./solver";
import { findArea, meetExtras, mergeTips } from "./meetTips";
import { parseWhen, type LocalTime } from "./eventTime";
import { SAMPLE_WEATHER, getWeather, weatherTips, type Place } from "./weather";
import { getLineStatus, getRoutes, linesIn, locate } from "./travel";
import { lineChanges, routeChanges, travelChange, weatherChange } from "./watch";
import { sendWhatsApp, startWhatsApp, type WaMessage } from "./sources/whatsapp";

// Demo orchestration: chat → detect/extract → solve → explain → cascade → book → invite/call.

const CASCADE_STEP_MS = Number(process.env.CASCADE_STEP_MS ?? 400);
const SIM_JOIN_MS = Number(process.env.SIM_JOIN_MS ?? 150);
const CALL_DELAY_MS = Number(process.env.CALL_DELAY_MS ?? 2500);
const REEXPLAIN_MS = Number(process.env.REEXPLAIN_MS ?? 600);
// Let the VIABLE flip land on stage before the booking replaces it.
const VIABLE_HOLD_MS = Number(process.env.VIABLE_HOLD_MS ?? 2500);
const CALL_RESEND_WINDOW_MS = 30_000;
/** New messages within this window go to Grok as one update call. */
const DELTA_BATCH_MS = Number(process.env.DELTA_BATCH_MS ?? 2000);
/** Plan blocked with no change for this long: the agent nudges someone. */
const NEGOTIATE_AFTER_MS = Number(process.env.NEGOTIATE_AFTER_MS ?? 10_000);
/** How often the weather and travel jobs refresh while a plan is live. */
const WEATHER_EVERY_MS = Number(process.env.WEATHER_REFRESH_MS ?? 10 * 60_000);
const TRAVEL_EVERY_MS = Number(process.env.TRAVEL_REFRESH_MS ?? 15 * 60_000);
/** Votes on one option that make it the plan. */
const VOTES_TO_PICK = Number(process.env.SUGGEST_VOTES ?? 3);
/** Where to look for places when the chat names nowhere. */
const DEFAULT_AREA = process.env.DEFAULT_AREA ?? "Shoreditch";
/** "@deadlock ..." or "we should ..." starts a plan. */
const TRIGGER = /@deadlock|\bwe should\b/i;

export const PHONE_COLORS = ["#9C8F7A", "#7D8B74", "#8C7A6B", "#6F8287", "#A08C5B", "#857A8F"];
const SIM_NAMES = ["Alex", "Jordan", "Sasha", "Robin", "Kai", "Noor", "Ellis", "Rafi", "Jess", "Ade",
  "Toby", "Mina", "Luca", "Zara", "Owen", "Isla", "Theo", "Ana", "Femi", "Cleo"];

export type Role = "attend" | "laptop" | "help";
export type Step = "detect" | "extract" | "explain" | "cascade" | "book" | "call" | "negotiate" | "tips" | "suggest";

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
let simCount = 0;
let rsvps = new Map<string, Role>();
let joinOrder: string[] = [];
let callTarget: string | null = null;
let callScript: string | null = null;
let invites: Record<string, string> = {};
let lastCall: { personId: string; at: number } | null = null;
let explainGen = 0;
let reexplainTimer: ReturnType<typeof setTimeout> | null = null;
let forceAll = false;
let detecting = false;
let settling = false;
let resettle = false;
let booking = false;
// Seeded chat counts last week's poll; a live WhatsApp group starts at 0.
let seedAttending = SEED_ATTENDING;
let stopSource: (() => void) | null = null;
let groupJid: string | null = null; // WhatsApp chat of the current event
let announced = false; // stuck summary posted into the chat for this plan
let hintedNoPlan = false; // "can't see a plan yet" posted once
let backfilling = false; // loading a chat's recent history: don't trigger per message
let redetect = false; // a trigger arrived mid-read: read again after
// Public base URL for links posted into WhatsApp (the tunnel). Learned from
// incoming requests unless PUBLIC_URL is set.
let publicUrl = (process.env.PUBLIC_URL ?? "").replace(/\/$/, "");
let pendingDelta: Message[] = [];
let deltaTimer: ReturnType<typeof setTimeout> | null = null;
let deltaRunning = false;
let nudgeTimer: ReturnType<typeof setTimeout> | null = null;
let declined = new Set<string>(); // commitment ids whose owner already said no
/** What the APIs and Grok added after booking; the chat clues are re-read on top each time. */
let enriched: { nearby?: string[]; travel?: string | null; weather?: WeatherInfo | null; routes?: TravelRoute[]; lines?: LineStatus[] } = {};
// Background weather/travel refresh. Switches survive resets; timers don't.
type Job = "weather" | "travel";
let jobsOn: Record<Job, boolean> = { weather: process.env.WEATHER_ENABLED !== "false", travel: process.env.TRAVEL_ENABLED !== "false" };
let jobTimers: Partial<Record<Job, ReturnType<typeof setTimeout>>> = {};
let watched: Partial<Record<Job, string>> = {}; // place + time the last answer was for
let suggestedTopics = new Set<string>(); // offered once per run
let suggesting = false;
let picked: PlanOption | null = null; // the option that became the plan

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const s = () => getState();

function seeded(base: State, scenario: Scenario = "workshop"): State {
  return { ...base, people: [...seedPeople], messages: seedMessagesFor(scenario) };
}

function clearPlan(st: State) {
  st.plan = null;
  st.commitments = [];
  st.blocking = [];
  st.explanation = "";
  st.event = null;
  st.attendeeTarget = DEFAULT_ATTENDEE_TARGET;
  st.asks = [];
  st.agentLog = [];
  st.notices = [];
  st.suggestion = null;
}

function clearRun() {
  epoch++;
  stopSource?.();
  stopSource = null;
  groupJid = null;
  announced = hintedNoPlan = false;
  pendingDelta = [];
  if (deltaTimer) clearTimeout(deltaTimer);
  if (nudgeTimer) clearTimeout(nudgeTimer);
  deltaTimer = nudgeTimer = null;
  deltaRunning = false;
  declined = new Set();
  callScript = null;
  invites = {};
  enriched = {};
  for (const t of Object.values(jobTimers)) clearTimeout(t);
  jobTimers = {};
  watched = {};
  suggestedTopics = new Set();
  suggesting = false;
  picked = null;
  lastCall = null;
  if (reexplainTimer) clearTimeout(reexplainTimer);
  reexplainTimer = null;
  forceAll = false;
  detecting = settling = resettle = booking = false;
}

/** Everything back to the seeded chat, no phones. */
export function resetDemo() {
  clearRun();
  rsvps = new Map();
  joinOrder = [];
  callTarget = null;
  seedAttending = SEED_ATTENDING;
  const next = seeded(emptyState(s().mock));
  next.jobs = { ...jobsOn };
  recount(next);
  replaceState(next);
}

/** Re-seed the chat and drop the plan; joined phones stay. "sports" seeds the football chat. */
export function reseed(scenario: Scenario = "workshop") {
  clearRun();
  const phones = s().people.filter((p) => p.source === "phone");
  seedAttending = SEED_ATTENDING;
  const next = seeded({ ...s() }, scenario);
  next.people = [...seedPeople, ...phones];
  clearPlan(next);
  recount(next);
  replaceState(next);
}

/** Headcount before the chat's own "I'll come" commitments: seeded poll + phones. */
function baseAttendees(): number {
  return seedAttending + s().people.filter((p) => p.source === "phone").length;
}

export function setPublicUrl(url: string) {
  if (!process.env.PUBLIC_URL) publicUrl = url.replace(/\/$/, "");
}

/** Everything the bot posts is labelled, since it goes out as the signed-up person. */
function botSay(text: string) {
  if (groupJid) void sendWhatsApp(groupJid, `🤖 *Deadlock bot*\n${text}`);
}

function recount(st: State) {
  st.attendeeCount = seedAttending + st.people.filter((p) => p.source === "phone").length;
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
  scheduleReexplain();
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
    join(SIM_NAMES[simCount++ % SIM_NAMES.length]); // keep going across presses: no duplicate names
  }
}

export function setCallTarget(personId: string) {
  callTarget = personId || null;
}

/** Admin-picked call target, or null for "most recent phone". */
export function getCallTarget() {
  return callTarget && s().people.some((p) => p.id === callTarget) ? callTarget : null;
}

export function setMock(on: boolean) {
  llm.setMockMode(on);
  update((st) => {
    st.mock = on;
  });
}

/**
 * A phone that (re)joins after booking still gets its invite, and the call
 * target gets the call again if it refreshed within moments of being rung.
 */
export function catchUp(personId: string) {
  const event = s().event;
  if (!event) return;
  const person = s().people.find((p) => p.id === personId);
  if (!person) return;
  emit.toPerson(personId, "invite", { text: inviteFor(person, event) });
  if (callScript && lastCall?.personId === personId && Date.now() - lastCall.at < CALL_RESEND_WINDOW_MS) {
    emit.toPerson(personId, "call", { script: callScript });
  }
}

function inviteFor(p: Person, event: EventDetails) {
  return invites[p.id] ?? `${p.name}, you're in: ${event.title}, ${event.when} at ${event.where}.`;
}

// ───────────── WhatsApp source ─────────────

/** New event on a live WhatsApp group: empty chat, no phones, then stream the group in. */
export function startWhatsAppEvent(jid: string) {
  clearRun();
  rsvps = new Map();
  joinOrder = [];
  callTarget = null;
  seedAttending = 0;
  const next = emptyState(s().mock);
  next.jobs = { ...jobsOn };
  recount(next);
  replaceState(next);
  const my = epoch;
  groupJid = jid;
  try {
    // History loads synchronously; read it once at the end, not per message,
    // so an older bare "@deadlock" can't hide the real trigger.
    backfilling = true;
    stopSource = startWhatsApp(
      jid,
      (m) => {
        if (epoch === my) ingest(m);
      },
      (names) => {
        if (epoch === my) renamePeople(names);
      },
    );
    backfilling = false;
    if (!s().plan && s().messages.some((m) => TRIGGER.test(m.text))) void detect();
    else void maybeSuggest();
  } catch (err) {
    backfilling = false;
    // Never take the server down over the bridge; the page can pick again.
    console.warn("whatsapp source failed to start:", (err as Error).message);
  }
}

/** Real names from the bridge replace "Member N" placeholders. */
function renamePeople(names: Record<string, string>) {
  const changes = s().people.filter((p) => {
    const name = p.source === "whatsapp" ? names[p.id.slice("wa-".length)] : undefined;
    return name && name !== p.name;
  });
  if (!changes.length) return;
  update((st) => {
    for (const p of st.people) {
      const name = p.source === "whatsapp" ? names[p.id.slice("wa-".length)] : undefined;
      if (name) p.name = name;
    }
  });
}

function ingest(m: WaMessage) {
  const personId = `wa-${m.sender}`;
  update((st) => {
    const person = st.people.find((p) => p.id === personId);
    if (!person) {
      const color = PHONE_COLORS[st.people.length % PHONE_COLORS.length];
      st.people.push({ id: personId, name: m.name, color, source: "whatsapp" });
    } else if (person.name.startsWith("Member ") && !m.name.startsWith("Member ")) {
      person.name = m.name;
    }
    st.messages.push({ id: `wa-${nextId++}`, personId, text: m.text, ts: m.ts });
  });
  onMessage(s().messages[s().messages.length - 1]);
}

// ───────────── chat → plan ─────────────

const DUPLICATE_WINDOW_MS = 5000;

export function chat(personId: string, text: string) {
  const clean = text.trim().slice(0, 280);
  if (!clean || !s().people.some((p) => p.id === personId)) return;
  // A double-tapped Send shouldn't put the same line on stage twice.
  const last = [...s().messages].reverse().find((m) => m.personId === personId);
  if (last && last.text === clean && Date.now() - last.ts < DUPLICATE_WINDOW_MS) return;
  update((st) => {
    st.messages.push({ id: `m-${nextId++}`, personId, text: clean, ts: Date.now() });
  });
  onMessage(s().messages[s().messages.length - 1]);
}

/** Before a plan: wait for the trigger. After: batch messages into one Grok update. */
function onMessage(m: Message) {
  if (backfilling) return;
  // After booking, chat is about the day itself: "bring a brolly", "pub after?".
  if (s().plan?.status === "booked") {
    refreshExtras();
    return;
  }
  if (!s().plan) {
    if (TRIGGER.test(m.text)) void detect();
    else if (!voteFromChat(m)) void maybeSuggest();
    return;
  }
  pendingDelta.push(m);
  if (deltaTimer) clearTimeout(deltaTimer);
  deltaTimer = setTimeout(() => void flushDelta(), DELTA_BATCH_MS);
}

async function flushDelta() {
  deltaTimer = null;
  if (deltaRunning || detecting) {
    deltaTimer = setTimeout(() => void flushDelta(), 500);
    return;
  }
  const batch = pendingDelta;
  pendingDelta = [];
  if (!batch.length || !s().plan || s().plan?.status === "booked") return;
  deltaRunning = true;
  const my = epoch;
  try {
    const delta = await llm.extractDelta(batch, s());
    if (epoch !== my) return;
    const name = (id: string) => s().people.find((p) => p.id === id)?.name ?? "someone";
    const changed = delta.upserts.length > 0 || delta.removes.length > 0;
    if (changed) {
      update((st) => {
        st.commitments = st.commitments.filter((c) => !delta.removes.includes(c.id));
        for (const u of delta.upserts) {
          const i = st.commitments.findIndex((c) => c.id === u.id);
          if (i >= 0) st.commitments[i] = { ...u, status: st.commitments[i].status };
          else st.commitments.push(u);
          log(st, `Picked up ${name(u.personId)}: ${u.offers}${u.requires.length ? " if " + u.requires.map(cond).join(" and ") : ""}`);
        }
        for (const id of delta.removes) log(st, `Dropped ${id}`);
        st.attendeeTarget = attendeeTarget(st.commitments);
      });
    }
    if (delta.askReply) answerAsk(delta.askReply.askId, delta.askReply.accept);
    else if (changed) {
      await settle();
      scheduleReexplain();
    }
  } finally {
    if (epoch === my) deltaRunning = false;
  }
  if (pendingDelta.length && !deltaTimer) deltaTimer = setTimeout(() => void flushDelta(), DELTA_BATCH_MS);
}

const cond = (r: { resource: string; minCount?: number }) => (r.minCount ? `${r.minCount}+ ${r.resource}` : r.resource);

function log(st: State, line: string) {
  st.agentLog = [...st.agentLog, line].slice(-8);
}

// ───────────── agent: nudge the bottleneck ─────────────

function scheduleNudge() {
  if (nudgeTimer) clearTimeout(nudgeTimer);
  nudgeTimer = null;
  if (s().plan?.status !== "blocked" || s().asks.some((a) => a.status === "open")) return;
  nudgeTimer = setTimeout(() => {
    nudgeTimer = null;
    void nudge();
  }, NEGOTIATE_AFTER_MS);
}

async function nudge() {
  if (s().plan?.status !== "blocked" || s().asks.some((a) => a.status === "open")) return;
  const my = epoch;
  const res = await llm.negotiate(s());
  if (epoch !== my || s().plan?.status !== "blocked" || s().asks.some((a) => a.status === "open")) return;
  if (res.action !== "ask" || declined.has(res.ask.proposal.commitmentId)) {
    update((st) => log(st, `Waiting: ${res.action === "wait" ? res.reason : "already asked"}`));
    return;
  }
  const ask: Ask = { ...res.ask, id: `ask-${nextId++}`, status: "open" };
  const person = s().people.find((p) => p.id === ask.personId);
  update((st) => {
    st.asks.push(ask);
    log(st, `Asking ${person?.name ?? "someone"}: ${ask.question}`);
  });
  if (person?.source === "phone") emit.toPerson(person.id, "ask", ask);
  botSay(ask.question);
}

/** Yes applies the proposal (code, not Grok, changes the condition); no is remembered. */
export function answerAsk(askId: string, accept: boolean) {
  const ask = s().asks.find((a) => a.id === askId && a.status === "open");
  if (!ask) return;
  const name = s().people.find((p) => p.id === ask.personId)?.name ?? "They";
  update((st) => {
    const a = st.asks.find((a) => a.id === askId)!;
    a.status = accept ? "accepted" : "declined";
    const c = st.commitments.find((c) => c.id === ask.proposal.commitmentId);
    if (accept && c) {
      log(st, `${name} said yes: ${c.requires.map(cond).join(", ")} → ${ask.proposal.requires.map(cond).join(", ") || "no conditions"}`);
      c.requires = ask.proposal.requires;
      st.attendeeTarget = attendeeTarget(st.commitments);
    } else {
      log(st, `${name} said no`);
    }
  });
  if (!accept) declined.add(ask.proposal.commitmentId);
  void settle().then(() => scheduleReexplain());
}

/** Admin/forced answer to whatever is open. */
export function answerOpenAsk(accept: boolean) {
  const open = s().asks.find((a) => a.status === "open");
  if (open) answerAsk(open.id, accept);
}

async function detect(replaceCommitments = false) {
  if (detecting) {
    redetect = true;
    return;
  }
  redetect = false;
  detecting = true;
  const my = epoch;
  try {
    const { plan, commitments } = await llm.detectAndExtract(s().messages, s().people);
    if (epoch !== my) return;
    if (!plan && redetect) return; // a newer trigger came in: the re-read below decides
    if (!plan) {
      if (groupJid && !hintedNoPlan) {
        hintedNoPlan = true;
        botSay(`I'm listening, but I can't see a plan yet. Say what you want to do, like "we should run a workshop next week", and who's in.`);
      }
      return;
    }
    update((st) => {
      if (!st.plan) st.plan = { ...plan, status: "blocked" };
      if (st.suggestion?.status === "open") st.suggestion.status = "dismissed";
      if (!st.commitments.length || replaceCommitments) st.commitments = keepUnlocked(commitments, st.commitments);
      st.attendeeTarget = attendeeTarget(st.commitments);
    });
    startJobs();
  } finally {
    if (epoch === my) detecting = false;
  }
  if (epoch === my && !s().plan && redetect) return detect();
  if (epoch !== my || !s().plan) return;
  await settle();
  await explain();
  announceStuck();
}

/** First time a WhatsApp plan is stuck: post why, and the stage link, into the chat. */
function announceStuck() {
  const st = s();
  if (!groupJid || announced || st.plan?.status !== "blocked") return;
  announced = true;
  const link = publicUrl ? ` Watch it unlock: ${publicUrl}/stage` : "";
  botSay(`${st.plan.title} is stuck. ${st.explanation}${link}`);
}

function keepUnlocked(next: Commitment[], prev: Commitment[]): Commitment[] {
  const unlocked = new Set(prev.filter((c) => c.status === "unlocked").map((c) => c.id));
  return next.map((c) => ({ ...c, status: unlocked.has(c.id) ? "unlocked" : "waiting" }));
}

function attendeeTarget(commitments: Commitment[]): number {
  const bars = commitments.flatMap((c) => c.requires).filter((r) => r.resource === ATTENDEES && r.minCount);
  if (bars.length) return Math.max(...bars.map((r) => r.minCount!));
  return seedAttending === 0 ? 1 : DEFAULT_ATTENDEE_TARGET; // a live chat: at least one person coming
}

/**
 * First explanation streams word by word. Re-explains (after joins) swap in
 * quietly so the panel never blanks; only the newest call's answer lands.
 */
async function explain({ quiet = false } = {}) {
  const my = epoch;
  const gen = ++explainGen;
  if (!s().plan) return;
  if (!quiet) {
    update((st) => {
      st.explanation = "";
    });
  }
  const text = await llm.explain(s(), (t) => {
    if (!quiet && epoch === my && gen === explainGen) emit.toAll("explain:chunk", { text: t });
  });
  // A join can make the plan viable while this streams; don't show a stale "why".
  // Nothing blocking (mid-cascade) means there is no "why" to show.
  if (epoch !== my || gen !== explainGen || s().plan?.status !== "blocked" || !s().blocking.length) return;
  update((st) => {
    st.explanation = text;
  });
}

function scheduleReexplain() {
  if (s().plan?.status !== "blocked") return;
  if (reexplainTimer) clearTimeout(reexplainTimer);
  reexplainTimer = setTimeout(() => {
    reexplainTimer = null;
    if (s().plan?.status === "blocked" && s().blocking.length) void explain({ quiet: true });
  }, REEXPLAIN_MS);
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
            attendeeCount: baseAttendees(),
            requiredForPlan: plan.requiredForPlan,
            attendeeTarget: s().attendeeTarget,
            counts: counts(),
          });

      update((st) => {
        st.blocking = result.blocking;
        // People who said "I'll come" in the chat count once their conditions unlock.
        if ("available" in result) st.attendeeCount = result.available[ATTENDEES] ?? baseAttendees();
        if (!result.blocking.length) st.explanation = ""; // the line is clearing: no "why it's stuck"
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
        if (VIABLE_HOLD_MS) await sleep(VIABLE_HOLD_MS);
        if (epoch !== my) return;
        await book();
        if (epoch !== my) return;
      }
    } while (resettle);
  } finally {
    if (epoch === my) settling = false;
  }
  if (epoch === my) scheduleNudge();
}

async function book() {
  if (booking || !s().plan || s().plan?.status === "booked") return;
  booking = true;
  const my = epoch;
  try {
    const result = await llm.book(s(), extrasFor(), picked ?? undefined);
    if (epoch !== my) return;
    callScript = result.callScript;
    invites = result.invites;
    const e: EventDetails = { ...result.event, extras: extrasFor(result.event.where) };
    update((st) => {
      st.event = e;
      if (st.plan) st.plan.status = "booked";
    });
    emit.toAll("booked", e);
    botSay(`It's on! ${e.title}, ${e.when} at ${e.where}. ${e.blurb}${publicUrl ? ` ${publicUrl}/stage` : ""}`);
    for (const p of s().people.filter((p) => p.source === "phone")) {
      emit.toPerson(p.id, "invite", { text: inviteFor(p, e) });
    }
    // Things to do nearby: Grok's take lands a moment later; the guide is already up.
    void enrichExtras();
  } finally {
    if (epoch === my) booking = false;
  }
  if (CALL_DELAY_MS) await sleep(CALL_DELAY_MS);
  if (epoch === my) call();
}

// ───────────── meet extras: travel, weather, what to bring, nearby ─────────────


function extrasFor(where = s().event?.where): MeetExtras {
  const base = meetExtras({ messages: s().messages, planTitle: s().plan?.title, where });
  let tips = base.tips;
  // A how-to-get-there from someone in the chat beats Grok's.
  if (enriched.travel && !tips.some((t) => t.kind === "travel" && t.personId)) {
    tips = [{ kind: "travel", label: `Nearest: ${enriched.travel}` }, ...tips.filter((t) => t.kind !== "travel")];
  }
  if (enriched.weather) {
    const { forecast, kit } = weatherTips(enriched.weather);
    tips = mergeTips([forecast, ...tips, ...kit]);
  }
  const chatIdeas = base.tips.filter((t) => t.kind === "activity").map((t) => t.label);
  return {
    ...base,
    tips,
    // Ideas from the chat first, then what Grok (or the area guide) suggested.
    nearby: enriched.nearby ? [...new Set([...chatIdeas, ...enriched.nearby])].slice(0, 4) : base.nearby,
    weather: enriched.weather ?? null,
    routes: enriched.routes ?? [],
    lines: enriched.lines ?? [],
  };
}

/**
 * After booking: Grok's nearby ideas plus a weather and travel refresh for the
 * venue, all at once (each has its own timeout and fallback), then one
 * "Good to know" post. The timers then carry on from here.
 */
async function enrichExtras() {
  const my = epoch;
  const event = s().event;
  if (!event?.extras) return;
  const [nearby] = await Promise.all([llm.suggestNearby(s(), event, event.extras), runJob("weather"), runJob("travel")]);
  if (epoch !== my || !s().event) return;
  enriched.nearby = nearby?.nearby;
  enriched.travel = nearby?.travel;
  applyExtras();
  scheduleJob("weather", WEATHER_EVERY_MS);
  scheduleJob("travel", TRAVEL_EVERY_MS);
  const line = extrasLine(s().event!.extras!);
  if (line) botSay(line);
}

function applyExtras() {
  if (!s().event?.extras) return;
  update((st) => {
    if (st.event) st.event.extras = extrasFor();
  });
}

// ───────────── weather + travel jobs ─────────────

interface Target {
  place: Place;
  at: LocalTime | null;
  key: string;
}

/**
 * What to watch: the booked venue at the event time; before booking, the
 * area the chat names, right now (the day isn't settled yet). Null when the
 * chat hasn't named anywhere we know.
 */
async function jobTarget(): Promise<Target | null> {
  const ev = s().event;
  let place: Place | null;
  let at: LocalTime | null = null;
  if (ev) {
    place = await locate(findArea([ev.where, ev.extras?.area ?? ""]), ev.where, { offline: s().mock });
    at = parseWhen(ev.when);
  } else {
    const area = findArea([...s().messages].reverse().map((m) => m.text));
    place = area && { name: area.station, lat: area.lat, lon: area.lon };
  }
  return place && { place, at, key: `${place.lat},${place.lon}@${at ? `${at.date}T${at.time}` : "now"}` };
}

function scheduleJob(job: Job, delayMs: number) {
  clearTimeout(jobTimers[job]);
  delete jobTimers[job];
  if (!jobsOn[job] || !s().plan) return;
  const my = epoch;
  const every = job === "weather" ? WEATHER_EVERY_MS : TRAVEL_EVERY_MS;
  jobTimers[job] = setTimeout(() => {
    void runJob(job).finally(() => {
      if (epoch === my) scheduleJob(job, every);
    });
  }, delayMs);
  jobTimers[job].unref?.();
}

function startJobs() {
  scheduleJob("weather", 0);
  scheduleJob("travel", 0);
}

/**
 * One refresh. A failed call keeps the last good answer. A change since the
 * last answer for the same place and time becomes a notice; a new place or
 * time (e.g. the venue just got booked) quietly becomes the new baseline.
 */
async function runJob(job: Job) {
  if (!jobsOn[job] || !s().plan) return;
  const my = epoch;
  const t = await jobTarget();
  if (!t || epoch !== my) return;
  const offline = s().mock;
  const same = watched[job] === t.key;
  if (job === "weather") {
    const w = await getWeather(t.place, t.at, { sample: offline });
    if (!w || epoch !== my) return;
    const change = same ? weatherChange(enriched.weather, w) : null;
    enriched.weather = w;
    watched.weather = t.key;
    applyExtras();
    if (change) notify("weather", change);
    return;
  }
  const routes = await getRoutes(t.place, t.at, { offline });
  const lines = await getLineStatus(linesIn(routes), { offline });
  if (epoch !== my) return;
  const change = same ? travelChange([...lineChanges(enriched.lines, lines ?? []), ...routeChanges(enriched.routes, routes)]) : null;
  enriched.routes = routes;
  if (lines) enriched.lines = lines;
  watched.travel = t.key;
  applyExtras();
  if (change) notify("travel", change);
}

/** Tell everyone: stage log, phones (buzz), and the WhatsApp group. */
function notify(kind: Notice["kind"], text: string) {
  const notice: Notice = { id: `n-${nextId++}`, kind, text, ts: Date.now() };
  // The stage log is one short line: "Weather: Clear, 15°C", "Travel: Northern line: Severe Delays".
  const body = text.replace(/^(Weather|Travel) update: /, "");
  const short = kind === "weather" ? `Weather: ${body.split(" (was")[0].split(", ").slice(0, 2).join(", ")}` : `Travel: ${body.split("; ")[0].replace(/\.$/, "")}`;
  update((st) => {
    st.notices = [...(st.notices ?? []), notice].slice(-5);
    log(st, short);
  });
  emit.toAll("notice", notice);
  botSay(text);
}

/** Admin switches. Turning one on refreshes it straight away. */
export function setJobs(next: Partial<Record<Job, boolean>>) {
  for (const job of ["weather", "travel"] as Job[]) {
    if (typeof next[job] !== "boolean" || next[job] === jobsOn[job]) continue;
    jobsOn[job] = next[job]!;
    scheduleJob(job, 0); // off: just clears the timer
  }
  update((st) => {
    st.jobs = { ...jobsOn };
  });
}

/** Admin: force a change notice for the demo, as if the next refresh had found it. */
export function simulateChange(kind: Job) {
  if (!s().plan) return;
  if (kind === "weather") {
    const prev = enriched.weather ?? SAMPLE_WEATHER;
    const dry = prev.code === "rain" || prev.code === "drizzle" || prev.code === "storm" || (prev.rainChance ?? 0) >= 40;
    const next: WeatherInfo = dry
      ? { summary: "Clear, 15°C, 5% chance of rain", tempC: 15, rainChance: 5, code: "clear", source: prev.source }
      : { summary: "Heavy rain, 9°C, 90% chance of rain", tempC: 9, rainChance: 90, code: "rain", source: prev.source };
    const change = weatherChange(prev, next);
    enriched.weather = next;
    applyExtras();
    if (change) notify("weather", change);
    return;
  }
  const routes = enriched.routes ?? [];
  const id = linesIn(routes)[0] ?? "northern";
  const line: LineStatus = { id, name: id.charAt(0).toUpperCase() + id.slice(1).replace("-", " & "), status: "Severe Delays", good: false };
  const slow = routes.find((r) => r.minutes !== null);
  enriched.lines = [line, ...(enriched.lines ?? []).filter((l) => l.id !== id)];
  if (slow) enriched.routes = routes.map((r) => (r === slow ? { ...r, minutes: r.minutes! + 20 } : r));
  applyExtras();
  notify("travel", travelChange([`${line.name} line: ${line.status}`, ...(slow ? [`from ${slow.from} now ${slow.minutes! + 20} min (was ${slow.minutes})`] : [])])!);
}

/** New chat after booking: re-read the clues, keep what the APIs said. */
function refreshExtras() {
  applyExtras();
}

const mins = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}` : ""}`);

function extrasLine(x: MeetExtras): string {
  const of = (kind: string) => x.tips.filter((t) => t.kind === kind).map((t) => t.label);
  const routes = (x.routes ?? []).filter((r) => r.minutes);
  const parts = [
    of("travel")[0] && `Getting there: ${of("travel")[0].replace(/^Nearest: /, "")}.`,
    routes.length && `Journey times: ${routes.map((r) => `${r.from.replace(/ London$/, "")} ${mins(r.minutes!)}`).join(", ")}.`,
    of("meetingPoint")[0] && `Meet: ${of("meetingPoint")[0]}.`,
    x.weather && `Weather: ${x.weather.summary}.`,
    of("bring").length && `Bring: ${of("bring").join(", ").toLowerCase()}.`,
    of("wear").length && `Wear: ${of("wear").join(", ").toLowerCase()}.`,
    x.nearby.length && `Nearby${x.area ? ` in ${x.area}` : ""}: ${x.nearby.join("; ")}.`,
  ].filter(Boolean);
  return parts.length ? `Good to know\n${parts.join("\n")}` : "";
}

/** Admin pick if set, else the most recent phone that's still connected. */
function pickCallTarget(): string | null {
  if (callTarget && s().people.some((p) => p.id === callTarget)) return callTarget;
  return [...joinOrder].reverse().find((id) => emit.isOnline(id)) ?? null;
}

function call() {
  const target = pickCallTarget();
  if (!target || !callScript) return;
  lastCall = { personId: target, at: Date.now() };
  emit.toPerson(target, "call", { script: callScript });
}

// ───────────── suggest a plan when a topic has a quorum ─────────────

/**
 * Enough different people on one topic and no plan yet: offer three
 * options (live, a place, something in the area). Once per topic per run.
 * `force` (admin) takes any topic with at least one mention, else football.
 */
async function maybeSuggest(force = false) {
  if (s().plan || suggesting || s().suggestion?.status === "open") return;
  const chat = s().messages;
  const q = findQuorum(chat, { skip: suggestedTopics }) ?? (force ? findQuorum(chat, { minPeople: 1 }) ?? { topic: TOPICS[0], people: [], teams: [] } : null);
  if (!q) return;
  suggestedTopics.add(q.topic.key);
  suggesting = true;
  const my = epoch;
  try {
    const area = findArea([...chat].reverse().map((m) => m.text)) ?? findArea([DEFAULT_AREA]);
    const fixtures = q.topic.league ? await nextFixtures(q.topic.league, { offline: s().mock }) : null;
    const fixture = fixtures ? pickFixture(fixtures, q.teams) : null;
    const drafts = buildOptions(q.topic, { area, fixture, teams: q.teams });
    const options = await llm.suggestPlans(q.topic.label, area?.name ?? null, chat, s().people, drafts);
    if (epoch !== my || s().plan) return;
    const suggestion: Suggestion = { id: `sg-${nextId++}`, topic: q.topic.label, people: q.people, area: area?.name ?? null, options, status: "open" };
    const names = q.people.map((id) => s().people.find((p) => p.id === id)?.name ?? "someone");
    update((st) => {
      st.suggestion = suggestion;
      log(st, `Offering 3 plans: ${q.topic.label}`);
    });
    emit.toAll("suggestion", suggestion);
    botSay(suggestionText(suggestion, names));
  } finally {
    if (epoch === my) suggesting = false;
  }
}

/** "1", "option 2"... from someone in the chat while a suggestion is open. */
function voteFromChat(m: Message): boolean {
  if (s().suggestion?.status !== "open" || m.text.startsWith("🤖")) return false;
  const option = parseVote(m.text);
  if (!option) return false;
  vote(m.personId, option);
  return true;
}

/** One vote per person; moving it is fine. Enough votes on one option picks it. */
export function vote(personId: string, optionId: PlanOption["id"]) {
  const sg = s().suggestion;
  if (sg?.status !== "open" || !s().people.some((p) => p.id === personId)) return;
  if (!sg.options.some((o) => o.id === optionId)) return;
  update((st) => {
    for (const o of st.suggestion!.options) {
      o.votes = o.votes.filter((v) => v !== personId);
      if (o.id === optionId) o.votes.push(personId);
    }
  });
  const chosen = s().suggestion!.options.find((o) => o.id === optionId)!;
  if (chosen.votes.length >= VOTES_TO_PICK) void pick(optionId);
}

/** The option becomes the plan: headcount is the only condition, then the usual solve, cascade and booking. */
export async function pick(optionId: PlanOption["id"]) {
  const sg = s().suggestion;
  const option = sg?.status === "open" ? sg.options.find((o) => o.id === optionId) : undefined;
  if (!option || s().plan) return;
  picked = option;
  update((st) => {
    st.suggestion!.status = "picked";
    st.suggestion!.picked = optionId;
    st.plan = { id: "plan-1", title: option.plan, status: "blocked", requiredForPlan: [ATTENDEES] };
    st.commitments = [];
    st.attendeeTarget = attendeeTarget([]);
    log(st, `Picked: ${option.title}`);
  });
  botSay(`Going with ${option.title}. Say "I'm in" or scan the QR to count yourself in.`);
  startJobs();
  await settle();
  await explain();
  announceStuck();
}

// ───────────── admin force-steps ─────────────

export async function step(name: Step) {
  switch (name) {
    case "detect":
      if (s().plan) return;
      if (!s().messages.some((m) => TRIGGER.test(m.text))) chat(HOST_ID, TRIGGER_TEXT);
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
    case "negotiate":
      if (nudgeTimer) clearTimeout(nudgeTimer);
      nudgeTimer = null;
      // Forced from admin: a mis-tapped "no" earlier must not lock the agent out.
      declined.clear();
      await nudge();
      return;
    case "suggest":
      // Forced: offer again even if this topic was already offered.
      if (s().suggestion?.status === "open") update((st) => void (st.suggestion!.status = "dismissed"));
      suggestedTopics.clear();
      await maybeSuggest(true);
      return;
    case "tips":
      if (!s().event) return;
      refreshExtras();
      await enrichExtras();
      return;
  }
}
