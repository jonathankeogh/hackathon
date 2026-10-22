import { useEffect, useState, type ReactNode } from "react";
import type { EventDetails } from "@deadlock/shared/types";
import { socket } from "../socket";
import { useServerState } from "../useServerState";
import "./Admin.css";

// Presenter controls, phone-first. Every demo step can be forced from here
// if something fails live. Functional over pretty.

const STEPS = [
  ["detect", "Post the trigger line if missing, create the plan"],
  ["extract", "Re-read the chat for commitments"],
  ["explain", "Re-run “why it's stuck”"],
  ["cascade", "Top up attendees and unlock everything"],
  ["book", "Book now: event page, invites, call"],
  ["call", "Ring the call target again"],
] as const;

const TRIGGER = "we should run a hands-on Grok agents workshop next week";

type Log = { at: string; text: string };

export default function AdminPage() {
  const { state, connected } = useServerState();
  const [personId, setPersonId] = useState("p-host");
  const [text, setText] = useState("");
  const [callTarget, setCallTarget] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [denied, setDenied] = useState(false);
  const [log, setLog] = useState<Log[]>([]);

  const note = (t: string) =>
    setLog((l) => [{ at: new Date().toLocaleTimeString("en-GB"), text: t }, ...l].slice(0, 12));

  useEffect(() => {
    const onInfo = (i: { callTarget: string | null; locked: boolean }) => {
      setCallTarget(i.callTarget);
      setLocked(i.locked);
    };
    const onDenied = () => setDenied(true);
    const onCascade = ({ order }: { order: string[] }) => note(`cascade: ${order.join(" → ")}`);
    const onBooked = (e: EventDetails) => note(`booked: ${e.title}, ${e.when}`);
    socket.on("admin:info", onInfo);
    socket.on("admin:denied", onDenied);
    socket.on("cascade", onCascade);
    socket.on("booked", onBooked);
    return () => {
      socket.off("admin:info", onInfo);
      socket.off("admin:denied", onDenied);
      socket.off("cascade", onCascade);
      socket.off("booked", onBooked);
    };
  }, []);

  const send = (event: string, payload?: unknown, label?: string) => {
    socket.emit(event, payload);
    note(label ?? event);
  };

  if (!state) {
    return <p className="p-6 font-mono uppercase">{connected ? "Waiting for state" : "Connecting…"}</p>;
  }
  const phones = state.people.filter((p) => p.source === "phone");
  const status = state.plan?.status ?? "no plan";
  const statusColor =
    status === "blocked" ? "text-signal-red" : status === "viable" || status === "booked" ? "text-signal-green" : "text-fg/60";

  return (
    <main className="admin-console mx-auto max-w-xl pb-16 font-mono">
      <header className="sticky top-0 z-10 border-b border-rule bg-bg px-4 py-3" data-testid="admin-status">
        <div className="admin-console-title"><a href="/">DEADLOCK</a><span>Presenter controls</span><a href="/stage">Stage ↗</a></div>
        <div className="admin-readout flex items-baseline justify-between gap-3 text-sm uppercase">
          <span className={connected ? "text-signal-green" : "text-signal-red"}>{connected ? "live" : "offline"}</span>
          <span className={statusColor}>{status}</span>
          <span>
            <span data-testid="admin-count">{state.attendeeCount}</span>/{state.attendeeTarget}
          </span>
          <span>{phones.length} phones</span>
          <span className={state.mock ? "text-signal-amber" : "text-fg/40"}>{state.mock ? "mock" : "Grok / fallback"}</span>
        </div>
        {denied && (
          <p className="mt-2 text-sm text-signal-red">
            Not allowed: open /admin?key=… with the server's ADMIN_KEY{locked ? "" : " and reload"}.
          </p>
        )}
      </header>

      <div className="space-y-8 px-4 pt-6">
        <Section title="Steps, in demo order">
          <div className="grid grid-cols-2 gap-2">
            {STEPS.map(([step, hint]) => (
              <Button key={step} onClick={() => send("admin:step", { step }, `step: ${step}`)} hint={hint}>
                {step}
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Audience">
          <div className="grid grid-cols-3 gap-2">
            {[1, 3, 20].map((n) => (
              <Button key={n} onClick={() => send("admin:simulateJoins", { count: n }, `simulate ${n} joins`)}>
                +{n} join{n > 1 ? "s" : ""}
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Chat">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              send("chat:send", { personId, text }, `chat as ${state.people.find((p) => p.id === personId)?.name}`);
              setText("");
            }}
          >
            <select className={field} value={personId} onChange={(e) => setPersonId(e.target.value)} aria-label="Send as">
              {state.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.source === "phone" ? " (phone)" : ""}
                </option>
              ))}
            </select>
            <input
              className={field}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message"
              aria-label="Message"
              data-testid="chat-input"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={() => setText(TRIGGER)}>Fill trigger</Button>
              <Button type="submit">Send</Button>
            </div>
          </form>
        </Section>

        <Section title="Who gets the call">
          <select
            className={field}
            value={callTarget ?? ""}
            onChange={(e) => send("admin:callTarget", { personId: e.target.value }, `call target: ${e.target.selectedOptions[0].text}`)}
            aria-label="Call target"
            data-testid="call-target"
          >
            <option value="">Most recent phone</option>
            {phones.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Section>

        <Section title="Demo">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => send("admin:mock", { on: !state.mock }, `mock ${state.mock ? "off" : "on"}`)}>
              Mock {state.mock ? "on" : "off"}
            </Button>
            <Button onClick={() => send("admin:seed", undefined, "re-seed chat")} hint="Keeps phones">
              Re-seed
            </Button>
            <Button
              danger
              onClick={() => {
                if (confirm("Reset the whole demo? Phones will need to rejoin.")) send("admin:reset", undefined, "reset");
              }}
              hint="Back to the seeded chat"
            >
              Reset
            </Button>
          </div>
        </Section>

        <Section title="Log">
          <ol className="space-y-1 text-sm text-fg/70" data-testid="admin-log">
            {log.length === 0 && <li className="text-fg/40">Nothing yet</li>}
            {log.map((l, i) => (
              <li key={i}>
                <span className="text-fg/40">{l.at}</span> {l.text}
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </main>
  );
}

const field = "w-full border border-rule bg-bg p-4 text-base text-fg outline-none focus:border-fg";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-[0.2em] text-fg/50">{title}</h2>
      {children}
    </section>
  );
}

function Button({
  children,
  hint,
  danger,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  hint?: string;
  danger?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`flex min-h-16 w-full flex-col items-start justify-center border px-4 py-3 text-left uppercase tracking-wider active:bg-fg active:text-bg ${
        danger ? "border-signal-red text-signal-red" : "border-rule"
      }`}
    >
      <span className="text-base">{children}</span>
      {hint && <span className="mt-1 text-[11px] normal-case tracking-normal text-fg/50">{hint}</span>}
    </button>
  );
}
