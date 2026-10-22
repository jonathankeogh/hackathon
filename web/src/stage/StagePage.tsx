import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Condition, State } from "@deadlock/shared/types";
import { useServerState } from "../useServerState";
import { SplitFlap } from "./SplitFlap";
import "./Stage.css";

const conditionLabel = (condition: Condition) => condition.minCount ? `${condition.resource} ≥ ${condition.minCount}` : condition.resource;

export default function StagePage() {
  const { state, connected, explanation } = useServerState();
  const chatEnd = useRef<HTMLLIElement>(null);
  const lastMessage = state?.messages.at(-1)?.id;
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: "end", behavior: "instant" }); }, [lastMessage]);

  if (!state) return <p className="stage-loading">{connected ? "Waiting for state" : "Connecting"}</p>;
  const name = (id: string) => state.people.find((person) => person.id === id)?.name ?? id;
  const status = state.plan?.status ?? "none";
  const ready = status === "viable" || status === "booked";
  const remaining = Math.max(0, state.attendeeTarget - state.attendeeCount);

  return (
    <main className={`stage-box stage-scene-${status}`}>
      <section className="stage-chat" aria-label="Community chat">
        <header className="stage-chat-header">
          <p className="stage-label stage-brand"><span className="stage-brand-mark" aria-hidden="true"><i /><i /><i /></span>DEADLOCK / SIGNAL BOX</p>
          <h2>London AI builders</h2>
          <span className="stage-label stage-muted">COMMUNITY CHAT</span>
        </header>
        <ul className="stage-messages">
          {state.messages.map((message) => <li key={message.id} className={/\bwe should\b/i.test(message.text) ? "stage-trigger" : undefined}>
            <p className="stage-message-name">{name(message.personId)}</p>
            <p className="stage-message-text">{message.text}</p>
          </li>)}
          <li ref={chatEnd} className="stage-chat-end" aria-hidden="true" />
        </ul>
      </section>

      <section className="stage-main" aria-label="Plan and dependency signals">
        <header className="stage-plan-heading">
          <p className="stage-label">DEPARTURES / THE PLAN</p>
          <h1>{state.plan?.title ?? "Waiting for a ‘we should…’"}</h1>
        </header>
        <div className={`stage-console ${ready ? "is-clear" : ""}`}>
          <div className="stage-console-edge" aria-hidden="true" />
          <div className="stage-console-face">
            <div className="stage-console-ident"><span>DL—01 / INTERLOCKING</span><span>SIGNAL CONTROL</span></div>
            <div className={`stage-status stage-status-${status}`} data-testid="plan-status" data-status={status} aria-label={`Plan ${status}`}>
              <span className="stage-status-caption">DEPARTURE STATUS</span>
              <SplitFlap text={status === "none" ? "STANDBY" : status.toUpperCase()} />
              <span className="stage-status-indicator" aria-hidden="true" />
            </div>
            <div className="stage-line-heading">
              <h2 className="stage-label">THE LINE</h2>
              <span className={`stage-label ${ready ? "stage-green" : "stage-muted"}`}>{!state.plan ? "NO ROUTE SET" : ready ? "ALL REQUIRED SIGNALS CLEAR" : "WAITING FOR THE MISSING PIECE"}</span>
            </div>
            <div className="stage-track-bay">
              {state.plan ? <SignalTrack state={state} name={name} /> : <IdleTrack />}
            </div>
            <div className={`stage-line-summary ${ready ? "stage-green" : "stage-amber"}`}>
              <span className="stage-summary-mark" />
              {ready ? "The line is clear." : !state.plan ? "Send a ‘we should…’ message to begin." : state.blocking.length ? `Held at ${state.blocking.map(conditionLabel).join(" · ")}` : "Reading the community's commitments…"}
            </div>
            <div className="stage-console-fasteners" aria-hidden="true"><i /><i /><i /><i /></div>
          </div>
        </div>
      </section>

      <aside className="stage-aside" aria-label="Attendance and audience joining">
        <section className="stage-attendance">
          <h2 className="stage-label">CONFIRMED ATTENDEES</h2>
          <p className={`stage-counter ${remaining === 0 ? "stage-green" : ""}`} data-testid="attendee-count" aria-label={`${state.attendeeCount} of ${state.attendeeTarget} attendees`}>
            <span className="stage-counter-value">{String(state.attendeeCount).split("").map((digit, index) => <span key={`${index}-${digit}`} className="stage-counter-digit">{digit}</span>)}</span>
            <span className="stage-counter-target">/{state.attendeeTarget}</span>
          </p>
          <div className={`stage-attendance-meter ${remaining === 0 ? "is-clear" : ""}`} role="progressbar" aria-label="Attendance progress" aria-valuemin={0} aria-valuemax={state.attendeeTarget} aria-valuenow={Math.min(state.attendeeCount, state.attendeeTarget)}>
            {Array.from({ length: state.attendeeTarget }, (_, index) => <i key={index} className={index < state.attendeeCount ? "is-filled" : ""} />)}
          </div>
          <p className="stage-count-note">{remaining ? `${remaining} more to clear the line` : "Attendance signal clear"}</p>
        </section>
        {state.event ? <EventBoard event={state.event} /> : <section className="stage-reason">
          <h2 className="stage-label">{ready ? "LINE CLEAR" : "WHY IT'S STUCK"}</h2>
          <p data-testid="explanation">{ready ? "Every required commitment is unlocked. Preparing the event and invitations." : explanation || (state.plan ? "Reading the conditions…" : "A plan begins with one message.")}</p>
        </section>}
        <JoinQR />
        <footer className="stage-footer">
          <span className={`stage-connection ${connected ? "" : "stage-red"}`}><i />{connected ? "LIVE" : "DISCONNECTED"}</span>
          {state.mock && <span>MOCK LLM</span>}
        </footer>
      </aside>
    </main>
  );
}

type Point = { x: number; y: number };

function IdleTrack() {
  return <div className="stage-idle-track">
    <svg viewBox="0 0 780 258" aria-hidden="true">
      <path className="stage-idle-trench" d="M 34 86 H 734 M 254 86 H 340 L 390 136 V 174 L 432 216 H 504" />
      <path className="stage-idle-rail" d="M 34 86 H 734 M 254 86 H 340 L 390 136 V 174 L 432 216 H 504" />
      {[34, 254, 474, 734].map((x) => <g key={x}><ellipse className="stage-lamp-base" cx={x} cy={93} rx="25" ry="23" /><circle className="stage-lamp-rim" cx={x} cy={86} r="23" /><circle className="stage-lamp-idle" cx={x} cy={86} r="13" /></g>)}
    </svg>
    <p className="stage-label">A conversation becomes a plan.</p>
    <p>One message sets the mechanism in motion.</p>
  </div>;
}

function SignalTrack({ state, name }: { state: State; name: (id: string) => string }) {
  const mainResources = ["venue", "speaker"];
  const mainGroups = mainResources.map((resource) => state.commitments.filter((commitment) => commitment.offers === resource));
  const branches = state.commitments.filter((commitment) => !mainResources.includes(commitment.offers));
  const positions = new Map<string, Point>();
  const attendancePoint = { x: 34, y: 68 };
  const planPoint = { x: 734, y: 68 };
  const mainRows = Math.max(1, ...mainGroups.map((group) => group.length));
  let nextRow = 68;
  // Alternative providers share a resource column, never a signal position.
  // Keep the seeded row spacing, allowing longer live quotes more room.
  for (let row = 0; row < mainRows; row++) {
    const rowCommitments = mainGroups.flatMap((group, column) => {
      const commitment = group[row];
      if (!commitment) return [];
      positions.set(commitment.id, { x: 250 + column * 220, y: nextRow });
      return [commitment];
    });
    const quoteLines = Math.max(1, ...rowCommitments.map((commitment) => wrapQuote(`“${commitment.quote}”`, 25).length));
    nextRow += Math.max(218, 82 + (quoteLines - 1) * 21 + 52);
  }
  let height = 420 + nextRow - 286;
  branches.forEach((commitment, index) => {
    positions.set(commitment.id, { x: 470, y: nextRow });
    const quoteLines = wrapQuote(`“${commitment.quote}”`, 25).length;
    height = Math.max(height, nextRow + 134 + Math.max(0, quoteLines - 2) * 21);
    if (index < branches.length - 1) nextRow += Math.max(152, 82 + (quoteLines - 1) * 21 + 49);
  });
  const attendeesReady = state.attendeeCount >= state.attendeeTarget;
  const planReady = state.plan?.status === "viable" || state.plan?.status === "booked";
  const all = [...mainGroups.flat(), ...branches];
  const providers = (resource: string) => resource === "attendees"
    ? [{ id: "attendees", point: attendancePoint, unlocked: attendeesReady }]
    : all.filter((commitment) => commitment.offers === resource).map((commitment) => ({ id: commitment.id, point: positions.get(commitment.id)!, unlocked: commitment.status === "unlocked" }));

  // Required resources feeding another required resource reach the plan
  // through it; duplicate bypass rails would obscure the causal chain.
  const ancestors = (resource: string, seen = new Set<string>()): Set<string> => {
    if (seen.has(resource)) return seen;
    seen.add(resource);
    for (const commitment of all.filter((item) => item.offers === resource)) {
      for (const condition of commitment.requires) ancestors(condition.resource, seen);
    }
    return seen;
  };
  const required = state.plan?.requiredForPlan ?? [];
  const terminals = required.filter((resource) => !required.some((other) => other !== resource && ancestors(other).has(resource)));

  return <svg className="stage-track" viewBox={`0 0 780 ${height}`} role="img" aria-label={`Dependency line. ${all.map((commitment) => `${name(commitment.personId)} offers ${commitment.offers}, ${commitment.status}${commitment.requires.length ? `, needs ${commitment.requires.map(conditionLabel).join(" and ")}` : ""}`).join(". ")}. Plan ${state.plan?.status}.`}>
    {all.flatMap((commitment) => commitment.requires.flatMap((condition, index) => providers(condition.resource).map((provider) =>
      <Rail key={`${commitment.id}-${index}-${provider.id}`} from={provider.point} to={positions.get(commitment.id)!} clear={provider.unlocked && commitment.status === "unlocked"} />
    )))}
    {terminals.flatMap((resource) => providers(resource).map((provider) =>
      <Rail key={`plan-${resource}-${provider.id}`} from={provider.point} to={planPoint} clear={provider.unlocked && planReady} />
    ))}
    <TrackSignal point={attendancePoint} status={attendeesReady ? "unlocked" : "waiting"} label="ATTENDEES" who={`${state.attendeeCount} / ${state.attendeeTarget}`} quote={attendeesReady ? "Attendance threshold met" : `${Math.max(0, state.attendeeTarget - state.attendeeCount)} more people needed`} width={150} align="start" />
    {all.map((commitment) => <TrackSignal key={commitment.id} commitmentId={commitment.id} point={positions.get(commitment.id)!} status={commitment.status} label={commitment.offers.toUpperCase()} who={name(commitment.personId)} quote={`“${commitment.quote}”`} width={205} />)}
    <TrackSignal point={planPoint} status={planReady ? "unlocked" : "blocked"} label="PLAN" who={planReady ? "CLEAR" : "HELD"} width={100} align="end" />
  </svg>;
}

function Rail({ from, to, clear }: { from: Point; to: Point; clear: boolean }) {
  const turn = from.x + (to.x - from.x) / 2 - 20;
  const direction = Math.sign(to.y - from.y);
  const path = from.y === to.y ? `M ${from.x} ${from.y} H ${to.x}` : `M ${from.x} ${from.y} H ${turn - 20} L ${turn + 20} ${from.y + direction * 40} V ${to.y - direction * 40} L ${turn + 60} ${to.y} H ${to.x}`;
  return <g className={`stage-rail ${clear ? "is-clear" : ""}`}><path className="stage-rail-trench" d={path} transform="translate(0 3)" /><path className="stage-rail-edge" d={path} transform="translate(0 8)" /><path className="stage-rail-line" d={path} /><path className="stage-rail-line" d={path} transform="translate(0 6)" /></g>;
}

function wrapQuote(text: string, width: number) {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    if (!lines.length || `${lines[lines.length - 1]} ${word}`.length > width) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  return lines;
}

function TrackSignal({ point, status, label, who, quote, width, commitmentId, align = "middle" }: { point: Point; status: string; label: string; who: string; quote?: string; width: number; commitmentId?: string; align?: "start" | "middle" | "end" }) {
  const textX = align === "start" ? point.x - 18 : align === "end" ? point.x + 18 : point.x;
  return <g className={`stage-signal stage-signal-${status}`} data-signal={label.toLowerCase()} data-status={status} data-commitment-id={commitmentId}>
    <text className="stage-signal-label" x={textX} y={point.y - 40} textAnchor={align}>{label}</text>
    <g className="stage-lamp-mechanism">
      <ellipse className="stage-lamp-base" cx={point.x} cy={point.y + 7} rx="25" ry="23" />
      <circle className="stage-lamp-rim" cx={point.x} cy={point.y} r="24" />
      <circle className="stage-lamp-recess" cx={point.x} cy={point.y} r="18" />
      <circle className="stage-lamp" cx={point.x} cy={point.y} r="13" />
      <path className="stage-lamp-reflection" d={`M ${point.x - 9} ${point.y - 2} A 10 10 0 0 1 ${point.x + 3} ${point.y - 9}`} />
      <path className="stage-lamp-rim-highlight" d={`M ${point.x - 21} ${point.y - 6} A 23 23 0 0 1 ${point.x + 10} ${point.y - 21}`} />
      <circle className="stage-lamp-screw" cx={point.x - 19} cy={point.y + 12} r="1.5" /><circle className="stage-lamp-screw" cx={point.x + 19} cy={point.y + 12} r="1.5" />
    </g>
    <text className="stage-signal-name" x={textX} y={point.y + 52} textAnchor={align}>{who}</text>
    {quote && <text className="stage-signal-quote" x={textX} y={point.y + 82} textAnchor={align}>{wrapQuote(quote, Math.floor(width / 8)).map((line, index) => <tspan key={index} x={textX} dy={index ? 21 : 0}>{line}</tspan>)}</text>}
  </g>;
}

function EventBoard({ event }: { event: NonNullable<State["event"]> }) {
  return <section className="stage-event">
    <h2 className="stage-label stage-green">EVENT CONFIRMED</h2>
    <p className="stage-event-title">{event.title}</p>
    <div className="stage-event-row"><p className="stage-label">WHEN</p><SplitFlap text={event.when} compact /></div>
    <div className="stage-event-row"><p className="stage-label">WHERE</p><SplitFlap text={event.where} compact /></div>
    <ol className="stage-agenda">{event.agenda.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol>
  </section>;
}

function JoinQR() {
  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => { fetch("/api/config").then((response) => response.json()).then((config: { joinUrl: string }) => setJoinUrl(config.joinUrl)).catch(() => {}); }, []);
  if (!joinUrl) return null;
  return <section className="stage-join" data-join-url={joinUrl}>
    <h2 className="stage-label">SCAN TO CLEAR THE LINE</h2>
    <div className="stage-qr"><QRCodeSVG value={joinUrl} size={208} bgColor="#EDEAE2" fgColor="#0E0E0C" /></div>
    <p>{joinUrl.replace(/^https?:\/\//, "")}</p>
  </section>;
}
