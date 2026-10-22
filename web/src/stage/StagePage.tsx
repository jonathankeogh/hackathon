import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Commitment, State } from "@deadlock/shared/types";
import { useServerState } from "../useServerState";
import { TrackDiagram } from "./TrackDiagram";
import { SplitFlap, boardLines } from "./SplitFlap";
import { Odometer } from "./Odometer";
import { chime, onSoundChange, relayClick, soundOn, toggleSound } from "./sound";

// Projector view, 1920×1080: chat 30% | departures board + track 45% | counter, why, QR 25%.

const STATUS_BOARD: Record<string, { text: string; tone: string }> = {
  none: { text: "NO SERVICE", tone: "text-fg/40" },
  blocked: { text: "HELD AT SIGNAL", tone: "text-signal-red" },
  viable: { text: "VIABLE", tone: "text-signal-green" },
  booked: { text: "BOOKED", tone: "text-signal-green" },
};

const label = "font-mono text-[13px] uppercase tracking-[0.22em] text-fg/50";

export default function StagePage() {
  const { state, connected, explanation } = useServerState();
  const sound = useSyncExternalStore(onSoundChange, soundOn);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "s" || e.key === "S") toggleSound();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!state) {
    return <p className="p-10 font-mono uppercase tracking-[0.2em] text-fg/60">{connected ? "Waiting for state" : "Connecting"}</p>;
  }
  const status = state.plan?.status ?? "none";

  return (
    <main className="grid h-full grid-cols-[30%_45%_25%] overflow-hidden">
      <ChatPanel state={state} />

      <section className="flex min-h-0 flex-col border-x border-rule px-10 pt-9">
        <Board state={state} />
        <div className="mt-6 min-h-0 flex-1">
          {state.plan ? (
            // Relay click per signal that clears, chime when the plan does.
            <TrackDiagram state={state} onSwitch={(kind, aspect) => {
              if (aspect !== "green") return;
              if (kind === "plan") chime();
              else relayClick();
            }} />
          ) : (
            <EmptyLine />
          )}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col px-9 pt-9 pb-7">
        <Counter state={state} />
        <Arrivals state={state} />
        <div className="mt-8 min-h-0 flex-1">
          {status === "blocked" && explanation && (
            <div>
              <p className={label}>Why it's stuck</p>
              <p className="mt-3 text-[28px] leading-[1.3]" data-testid="explanation">{explanation}</p>
            </div>
          )}
          {status === "blocked" && <AgentPanel state={state} />}
          {status === "viable" && (
            <div>
              <p className={`${label} !text-signal-green`}>Line clear</p>
              <p className="mt-3 text-[28px] leading-[1.3]">Every condition is met. Booking it now.</p>
            </div>
          )}
          {status === "booked" && state.event && <Agenda event={state.event} />}
        </div>
        <JoinQR />
        <p className="mt-5 flex gap-4 font-mono text-[11px] uppercase tracking-[0.2em] text-fg/35">
          <span className={connected ? "" : "text-signal-red"}>{connected ? "Live" : "Offline"}</span>
          {state.mock && <span>Mock</span>}
          <button className="uppercase tracking-[0.2em] hover:text-fg" onClick={toggleSound}>Sound {sound ? "on" : "off"}</button>
        </p>
      </aside>

      {/* Stable hooks for the run scripts. */}
      <span className="sr-only" data-testid="plan-status">{status === "none" ? "no plan" : status}</span>
      <span className="sr-only" data-testid="attendee-count">{state.attendeeCount}/{state.attendeeTarget}</span>
    </main>
  );
}

function Board({ state }: { state: State }) {
  const status = state.plan?.status ?? "none";
  const board = STATUS_BOARD[status];
  const title = state.plan ? boardLines(state.plan.title, 28) : ["AWAITING A PLAN"];
  const event = state.event;
  return (
    <div data-testid="board">
      <h1 className="sr-only">{state.plan?.title ?? "No plan yet"}</h1>
      <div className="flex items-baseline justify-between">
        <p className={label}>Departures</p>
        <p className={label}>
          Platform 1 · <StationClock />
        </p>
      </div>
      <div className="mt-4 space-y-1.5">
        {title.map((line, i) => (
          <SplitFlap key={i} text={line} length={28} size={28} />
        ))}
        {title.length < 2 && <SplitFlap text="" length={28} size={28} className="opacity-60" />}
      </div>
      <div className={`mt-5 ${board.tone}`}>
        <SplitFlap text={board.text} length={14} size={58} testId="board-status" />
      </div>
      <div className="mt-5 grid grid-cols-[72px_1fr] items-center gap-x-4 gap-y-1.5">
        <span className={label}>When</span>
        <SplitFlap text={event?.when ?? ""} length={26} size={20} />
        <span className={label}>Where</span>
        <SplitFlap text={event?.where ?? ""} length={26} size={20} />
      </div>
    </div>
  );
}

function EmptyLine() {
  return (
    <svg viewBox="0 0 820 200" className="w-full" aria-hidden>
      <path d="M26 150H780" stroke="var(--color-fg)" strokeOpacity={0.09} strokeWidth={11} strokeDasharray="2 9" />
      <path d="M26 150H780" stroke="var(--color-fg)" strokeOpacity={0.22} strokeWidth={2} />
      <text x="26" y="190" className="font-mono" fontSize="13" letterSpacing="2.6" fill="var(--color-fg)" fillOpacity={0.4}>
        WAITING FOR SOMEONE TO SAY “WE SHOULD…”
      </text>
    </svg>
  );
}

function Counter({ state }: { state: State }) {
  const met = state.attendeeCount >= state.attendeeTarget;
  const slots = Array.from({ length: state.attendeeTarget }, (_, i) => i < state.attendeeCount);
  return (
    <div>
      <p className={label}>Attendees</p>
      <p className="mt-2 flex items-end gap-3 font-mono leading-none">
        <Odometer value={state.attendeeCount} className={`text-[104px] font-medium ${met ? "text-signal-green" : ""}`} />
        <span className="pb-3 text-[40px] text-fg/35">/{state.attendeeTarget}</span>
      </p>
      {/* one slot per place needed: the platform filling up */}
      <div className="mt-4 flex gap-[3px]">
        {slots.map((filled, i) => (
          <span
            key={i}
            className={`h-3 flex-1 transition-colors duration-300 ${filled ? (met ? "bg-signal-green" : "bg-fg/80") : "bg-fg/10"}`}
          />
        ))}
      </div>
      <p className={`mt-3 font-mono text-[13px] uppercase tracking-[0.18em] ${met ? "text-signal-green" : "text-fg/50"}`}>
        {met ? "Threshold met" : `${state.attendeeTarget - state.attendeeCount} more needed`}
      </p>
    </div>
  );
}

/** The nudge agent at work: how long the line has been held, and what it's doing. */
function AgentPanel({ state }: { state: State }) {
  // Held since the line last moved: a join or a changed condition. Asking
  // someone isn't progress, so the clock keeps running while the agent waits.
  const key = `${state.attendeeCount}|${JSON.stringify(state.blocking)}|${JSON.stringify(state.commitments.map((c) => c.requires))}`;
  const [since, setSince] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setSince(Date.now()), [key]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const held = Math.max(0, Math.floor((now - since) / 1000));
  const lines = state.agentLog.slice(-3);
  const asking = state.asks.some((a) => a.status === "open");
  return (
    <div className="mt-10 border-t border-rule pt-6" data-testid="agent">
      <div className="flex items-baseline justify-between">
        <p className={`${label} flex items-center gap-2.5`}>
          <span className={`h-2 w-2 rounded-full ${asking ? "blink bg-signal-amber" : "bg-fg/30"}`} />
          Agent
        </p>
        <p className="font-mono text-[13px] uppercase tracking-[0.18em] text-fg/50">
          Held {Math.floor(held / 60)}:{String(held % 60).padStart(2, "0")}
        </p>
      </div>
      {lines.length ? (
        <ol className="mt-4 space-y-2.5">
          {lines.map((l, i) => (
            <li key={`${state.agentLog.length}-${i}`} className={`font-mono text-[15px] leading-snug ${i === lines.length - 1 ? "text-fg" : "text-fg/45"}`}>
              {l}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 font-mono text-[15px] text-fg/40">Watching the line.</p>
      )}
    </div>
  );
}

/** Wall clock for the departures board, ticking every second. */
function StationClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums text-fg/70">{now.toLocaleTimeString("en-GB")}</span>;
}

/** Audience names flip onto the board as they join, newest first. */
function Arrivals({ state }: { state: State }) {
  const firstSeen = useRef(new Map<string, number>());
  const phones = state.people.filter((p) => p.source === "phone");
  for (const p of phones) if (!firstSeen.current.has(p.id)) firstSeen.current.set(p.id, Date.now());
  const latest = [...phones].reverse().slice(0, 4);
  return (
    <div className="mt-8" data-testid="arrivals">
      <div className="flex items-baseline justify-between">
        <p className={label}>Arrivals</p>
        {phones.length > 0 && <p className="font-mono text-[13px] uppercase tracking-[0.18em] text-fg/45">{phones.length} from the room</p>}
      </div>
      {latest.length ? (
        <ol className="mt-3 space-y-1.5">
          {latest.map((p, i) => (
            <li key={p.id} className={`flex items-center justify-between ${i === 0 ? "" : "opacity-55"}`}>
              <SplitFlap text={p.name} length={12} size={19} />
              <span className="font-mono text-[13px] tabular-nums text-fg/45">
                {new Date(firstSeen.current.get(p.id)!).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 font-mono text-[14px] uppercase tracking-[0.12em] text-fg/40">Scan the code below. Your name goes up here.</p>
      )}
    </div>
  );
}

function Agenda({ event }: { event: NonNullable<State["event"]> }) {
  return (
    <div>
      <p className={`${label} !text-signal-green`}>Agenda</p>
      <ol className="mt-4 space-y-3" data-testid="agenda">
        {event.agenda.map((item) => {
          const [, time, rest] = item.match(/^(\d{1,2}:\d{2})\s*(.*)$/) ?? [, "", item];
          return (
            <li key={item} className="grid grid-cols-[64px_1fr] gap-3 border-t border-rule pt-3">
              <span className="font-mono text-[15px] text-fg/55">{time}</span>
              <span className="text-[18px] leading-snug">{rest}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 text-[16px] leading-snug text-fg/60">{event.blurb}</p>
    </div>
  );
}

function ChatPanel({ state }: { state: State }) {
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;
  const byQuote = (text: string): Commitment | undefined => state.commitments.find((c) => c.quote && text.includes(c.quote));
  const trigger = state.plan ? state.messages.find((m) => /\bwe should\b/i.test(m.text)) : undefined;
  const planGreen = state.plan?.status === "viable" || state.plan?.status === "booked";
  const end = useRef<HTMLLIElement>(null);
  const count = state.messages.length;
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [count]);

  return (
    <section className="flex min-h-0 flex-col px-10 pt-9">
      <p className={label}>Chat · London AI builders</p>
      <ol className="mt-6 min-h-0 flex-1 space-y-[18px] overflow-hidden pb-8">
        {state.messages.map((m, i) => {
          const c = byQuote(m.text);
          const isTrigger = m.id === trigger?.id;
          const lamp = isTrigger ? (planGreen ? "bg-signal-green" : "bg-signal-red") : c ? (c.status === "unlocked" ? "bg-signal-green" : "bg-signal-amber") : "";
          return (
            <li key={m.id} ref={i === count - 1 ? end : undefined} className="relative pl-6">
              {lamp && <span className={`absolute left-0 top-[7px] h-2.5 w-2.5 rounded-full transition-colors duration-300 ${lamp}`} />}
              <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-fg/45">
                {name(m.personId)}
                {isTrigger && <span className={`ml-3 ${planGreen ? "text-signal-green" : "text-signal-red"}`}>Plan</span>}
                {c && <span className={`ml-3 ${c.status === "unlocked" ? "text-signal-green" : "text-signal-amber"}`}>Offers {c.offers}</span>}
              </p>
              <p className={`mt-1 text-[19px] leading-snug ${c || isTrigger ? "text-fg" : "text-fg/55"}`}>{m.text}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function JoinQR() {
  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { joinUrl: string }) => setJoinUrl(c.joinUrl))
      .catch(() => {});
  }, []);
  if (!joinUrl) return null;
  return (
    <div className="flex items-end gap-5 border-t border-rule pt-6" data-join-url={joinUrl}>
      <div className="bg-fg p-2.5">
        <QRCodeSVG value={joinUrl} size={132} bgColor="#EDEAE2" fgColor="#0E0E0C" />
      </div>
      <div className="min-w-0 pb-1">
        <p className={label}>Scan to join</p>
        <p className="mt-2 break-all font-mono text-[14px] leading-snug text-fg/75">{joinUrl.replace(/^https?:\/\//, "")}</p>
      </div>
    </div>
  );
}
