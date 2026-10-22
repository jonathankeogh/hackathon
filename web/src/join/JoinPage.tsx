import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import { useServerState } from "../useServerState";
import PhoneCall from "./PhoneCall";
import "./Join.css";

const KEY = "deadlock.phone";
type Saved = { personId: string; name: string };
type Role = "attend" | "laptop" | "help";
type Ring = { script: string; id: number };
function load(): Saved | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return value && typeof value.name === "string" && typeof value.personId === "string" ? value : null;
  } catch { return null; }
}
function save(value: Saved | null) {
  try { if (value) localStorage.setItem(KEY, JSON.stringify(value)); else localStorage.removeItem(KEY); } catch { /* Socket still works without storage. */ }
}

export default function JoinPage() {
  const { state, connected } = useServerState();
  const [me, setMe] = useState<Saved | null>(() => load()?.personId ? load() : null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [call, setCall] = useState<Ring | null>(null);
  const [joining, setJoining] = useState(false);
  const sequence = useRef(0);
  const pending = useRef<Saved | null>(null);
  useEffect(() => {
    const rejoin = () => { const saved = pending.current ?? load(); if (saved) socket.emit("join", saved); };
    const onJoined = ({ personId }: { personId: string }) => {
      const next = { personId, name: pending.current?.name ?? load()?.name ?? "Guest" };
      pending.current = next; save(next); setMe(next); setJoining(false);
    };
    const onInvite = ({ text }: { text: string }) => {
      setInvite(text);
      if (navigator.userActivation?.hasBeenActive ?? true) {
        try { navigator.vibrate?.([200, 100, 200]); } catch { /* Optional browser haptics. */ }
      }
    };
    const onCall = ({ script }: { script: string }) => {
      window.speechSynthesis?.cancel(); setCall({ script, id: ++sequence.current });
    };
    const onDisconnect = () => setJoining(false);
    socket.on("connect", rejoin); socket.on("joined", onJoined);
    socket.on("invite", onInvite); socket.on("call", onCall); socket.on("disconnect", onDisconnect);
    if (socket.connected) rejoin();
    return () => {
      socket.off("connect", rejoin); socket.off("joined", onJoined);
      socket.off("invite", onInvite); socket.off("call", onCall); socket.off("disconnect", onDisconnect);
    };
  }, []);
  useEffect(() => {
    if (me && state && !state.people.some((person) => person.id === me.personId)) {
      save(null); pending.current = null; setMe(null); setRole(null); setInvite(null); setCall(null); setJoining(false);
      window.speechSynthesis?.cancel();
    }
  }, [me, state]);
  useEffect(() => {
    if (!state?.event) { setInvite(null); setCall(null); window.speechSynthesis?.cancel(); }
  }, [state?.event]);
  useEffect(() => {
    if (!joining) return;
    const retry = setInterval(() => { if (socket.connected && pending.current) socket.emit("join", pending.current); }, 4000);
    return () => clearInterval(retry);
  }, [joining]);
  if (call) return <PhoneCall key={call.id} script={call.script} onClose={() => setCall(null)} />;
  const title = state?.plan?.title ?? "Hands-on Grok agents workshop";
  const count = state?.attendeeCount ?? 0;
  const target = state?.attendeeTarget ?? 15;
  const masthead = <header className="phone-masthead"><span>DEADLOCK</span><span className={connected ? "phone-live" : "phone-offline"}><i />{connected ? "Live" : "Reconnecting"}</span></header>;
  if (!me) return <main className="phone-page">
    {masthead}
    <section className="phone-content">
      <RouteMark />
      <p className="phone-eyebrow">A plan needs its people</p><h1>One name.<br />One step closer.</h1>
      <p className="phone-intro">Join the workshop. Help turn the signal green.</p>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || joining || !connected) return;
        const next = { personId: "", name: name.trim().slice(0, 24) };
        pending.current = next; save(next); setJoining(true); socket.emit("join", { name: next.name });
      }}>
        <div className="phone-entry-head" aria-hidden="true"><span>Audience access</span><span>01 / Join</span></div>
        <label className="phone-eyebrow" htmlFor="first-name">Your first name</label>
        <input id="first-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="First name" autoComplete="given-name" maxLength={24} required data-testid="name-input" />
        <button className="phone-action phone-primary" type="submit" disabled={joining || !name.trim() || !connected}>{joining ? "Joining…" : !connected ? "Connecting…" : "Join"}<span aria-hidden="true">→</span></button>
      </form>
    </section>
    <footer className="phone-footnote">{title}</footer>
  </main>;
  if (invite && state?.event) return <main className="phone-page invite-page">
    {masthead}
    <section className="phone-content">
      <p className="phone-eyebrow phone-live"><span className="phone-lamp" />All signals green</p><h1>It's happening.</h1>
      <p className="phone-invite" data-testid="invite">{invite}</p>
      <div className="phone-ticket"><p className="phone-eyebrow">Your invitation</p><h2>{state.event.title}</h2>
        <dl><div><dt>When</dt><dd>{state.event.when}</dd></div><div><dt>Where</dt><dd>{state.event.where}</dd></div></dl>
        <ol>{state.event.agenda.map((item) => <li key={item}>{item}</li>)}</ol>
        <div className="phone-ticket-stub"><span>Admit one</span><strong>{me.name}</strong><span className="phone-ticket-code" aria-hidden="true">|||| ||| | |||| ||</span></div>
      </div>
    </section>
    <footer className="phone-footnote" data-testid="joined-as">You're in, {me.name}</footer>
  </main>;
  return <main className="phone-page">
    {masthead}
    <section className="phone-content"><RouteMark active={!!role} /><p className="phone-eyebrow">{role ? "Your place is counted" : "Choose your part"}</p>
      <h1 data-testid="joined-as">You're in,<br />{me.name}.</h1>
      {role ? <>
        <p className="phone-intro">{{ attend: "You're coming.", laptop: "You're bringing a laptop.", help: "You're ready to help." }[role]} The rest happens here.</p>
        <div className="phone-progress"><div className="phone-count-head"><span>Confirmed</span><span>People → venue → speaker</span></div><strong>{count}<span>/{target}</span></strong><progress aria-label="Confirmed attendees" max={Math.max(1, target)} value={Math.min(count, Math.max(1, target))} /><p>{Math.max(0, target - count) ? `${target - count} more ${target - count === 1 ? "person" : "people"} to unlock the room.` : "The signals are switching. Stand by."}</p></div>
        <button className="phone-change" onClick={() => setRole(null)}>Change my role</button>
      </> : <><p className="phone-intro">A place in the room, a laptop, or a helping hand.</p>
        <div className="phone-roles">{(["attend", "laptop", "help"] as Role[]).map((choice, i) => <button key={choice} className="phone-action" onClick={() => { setRole(choice); socket.emit("rsvp", { personId: me.personId, role: choice }); }}><span className="role-number" aria-hidden="true">0{i + 1}</span><span>{{ attend: "I'm in", laptop: "Bringing a laptop", help: "Can help" }[choice]}</span><span aria-hidden="true">→</span></button>)}</div>
      </>}
    </section>
    <footer className="phone-footnote">{title}<span>{count}/{target} confirmed</span></footer>
  </main>;
}

function RouteMark({ active = false }: { active?: boolean }) {
  return <div className={`phone-route${active ? " is-counted" : ""}`} aria-hidden="true"><span /><i /><span /><i /><span /><b>{active ? "Signal received" : "Every person moves the plan"}</b></div>;
}
