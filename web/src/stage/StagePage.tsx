import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Commitment, Condition, State } from "@deadlock/shared/types";
import { useServerState } from "../useServerState";

// Plain functional stage (#3/#6). Person 3 replaces this with the signal-box design.

const STATUS_COLOR: Record<string, string> = {
  none: "text-fg/50",
  blocked: "text-signal-red",
  viable: "text-signal-green",
  booked: "text-signal-green",
};

function cond(c: Condition) {
  return c.minCount ? `${c.resource} ≥ ${c.minCount}` : c.resource;
}

export default function StagePage() {
  const { state, connected, explanation } = useServerState();
  if (!state) return <p className="p-8 font-mono uppercase">{connected ? "Waiting for state" : "Connecting"}</p>;
  const name = (id: string) => state.people.find((p) => p.id === id)?.name ?? id;

  return (
    <main className="grid h-full grid-cols-12 divide-x divide-rule">
      <section className="col-span-4 overflow-y-auto p-8">
        <h2 className="mb-6 font-mono text-sm uppercase tracking-[0.2em] text-fg/60">London AI builders</h2>
        <ul className="space-y-4">
          {state.messages.map((m) => (
            <li key={m.id}>
              <span className="font-mono text-sm uppercase tracking-wider text-fg/60">{name(m.personId)}</span>
              <p className="text-xl">{m.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="col-span-5 p-8">
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-fg/60">Plan</p>
        <h1 className="mt-2 text-5xl font-semibold">{state.plan?.title ?? "No plan yet"}</h1>
        <p className={`mt-4 font-mono text-3xl uppercase ${STATUS_COLOR[state.plan?.status ?? "none"]}`} data-testid="plan-status">
          {state.plan?.status ?? "—"}
        </p>
        <ul className="mt-10 space-y-6">
          {state.commitments.map((c) => (
            <CommitmentRow key={c.id} c={c} who={name(c.personId)} />
          ))}
        </ul>
        {state.blocking.length > 0 && (
          <p className="mt-10 font-mono uppercase text-signal-red">Blocking: {state.blocking.map(cond).join(", ")}</p>
        )}
      </section>

      <section className="col-span-3 space-y-10 p-8">
        <div>
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-fg/60">Attendees</p>
          <p className="font-mono text-7xl" data-testid="attendee-count">
            {state.attendeeCount}
            <span className="text-fg/40">/{state.attendeeTarget}</span>
          </p>
        </div>
        {state.plan?.status === "blocked" && (
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.2em] text-fg/60">Why it's stuck</p>
            <p className="mt-2 text-2xl" data-testid="explanation">{explanation || "—"}</p>
          </div>
        )}
        {state.event && <EventCard event={state.event} />}
        <JoinQR />
        <p className={`font-mono text-xs uppercase ${connected ? "text-fg/40" : "text-signal-red"}`}>
          {connected ? "live" : "disconnected"}
          {state.mock && " · mock"}
        </p>
      </section>
    </main>
  );
}

function CommitmentRow({ c, who }: { c: Commitment; who: string }) {
  const lamp = c.status === "unlocked" ? "bg-signal-green" : "bg-signal-amber";
  return (
    <li className="flex gap-4">
      <span className={`mt-2 h-4 w-4 shrink-0 rounded-full ${lamp}`} />
      <div>
        <p className="text-2xl">
          {who} offers <b className="font-mono uppercase">{c.offers}</b>
          {c.requires.length > 0 && <span className="text-fg/60"> if {c.requires.map(cond).join(" and ")}</span>}
        </p>
        <p className="font-mono text-sm text-fg/50">"{c.quote}"</p>
      </div>
    </li>
  );
}

function EventCard({ event }: { event: NonNullable<State["event"]> }) {
  return (
    <div className="border-t border-rule pt-6">
      <p className="font-mono text-sm uppercase tracking-[0.2em] text-signal-green">Booked</p>
      <p className="mt-2 text-2xl font-semibold">{event.title}</p>
      <p className="font-mono">{event.when} · {event.where}</p>
      <ol className="mt-3 space-y-1 font-mono text-sm text-fg/70">
        {event.agenda.map((a) => <li key={a}>{a}</li>)}
      </ol>
    </div>
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
    <div className="space-y-3" data-join-url={joinUrl}>
      <p className="font-mono text-sm uppercase tracking-[0.2em] text-fg/60">Join</p>
      <div className="inline-block bg-fg p-3">
        <QRCodeSVG value={joinUrl} size={200} bgColor="#EDEAE2" fgColor="#0E0E0C" />
      </div>
      <p className="break-all font-mono text-sm text-fg/70">{joinUrl.replace(/^https?:\/\//, "")}</p>
    </div>
  );
}
