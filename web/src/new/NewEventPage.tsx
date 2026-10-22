import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { socket } from "../socket";
import "./NewEvent.css";

// Setup without a terminal: New event → scan the WhatsApp link QR → pick
// the group → open the stage.

type Group = { jid: string; name: string; size: number };
type WaStatus = {
  status: "offline" | "connecting" | "qr" | "connected";
  qr?: string;
  groups?: Group[];
  active?: { jid: string; name: string } | null;
};

export default function NewEventPage() {
  const [wa, setWa] = useState<WaStatus | null>(null);
  const [denied, setDenied] = useState(false);
  const [filter, setFilter] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  // Until "New Event" is clicked we only show the button (or a running event).
  const [started, setStarted] = useState(false);
  const newEvent = () => {
    setStarted(true);
    setFilter("");
    setWa((w) => (w ? { ...w, status: "connecting", active: null } : w));
    socket.emit("wa:new");
  };

  useEffect(() => {
    const watch = () => socket.emit("wa:watch");
    const onStatus = (s: WaStatus) => setWa(s);
    const onDenied = () => setDenied(true);
    if (socket.connected) watch();
    socket.on("connect", watch);
    socket.on("wa:status", onStatus);
    socket.on("admin:denied", onDenied);
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { joinUrl: string }) => setJoinUrl(c.joinUrl))
      .catch(() => {});
    return () => {
      socket.off("connect", watch);
      socket.off("wa:status", onStatus);
      socket.off("admin:denied", onDenied);
    };
  }, []);

  const btn = "border border-rule px-6 py-4 font-mono uppercase tracking-wider hover:bg-fg hover:text-bg";
  const label = "font-mono text-sm uppercase tracking-[0.2em] text-fg/60";

  let body;
  if (denied) {
    body = <p className="font-mono">This page needs the admin link (/new?key=…).</p>;
  } else if (!wa) {
    body = <p className="font-mono uppercase">Connecting…</p>;
  } else if (wa.active) {
    body = (
      <div className="space-y-8">
        <p className={label}>Live on WhatsApp</p>
        <h2 className="text-4xl">{wa.active.name}</h2>
        <div className="flex flex-wrap gap-4">
          <a className={btn} href="/stage" target="_blank" rel="noreferrer">Open stage</a>
          <button className={btn} onClick={newEvent}>New Event</button>
        </div>
        {joinUrl && (
          <div className="space-y-3">
            <p className={label}>Audience joins here</p>
            <div className="inline-block bg-fg p-4">
              <QRCodeSVG value={joinUrl} size={220} bgColor="#EDEAE2" fgColor="#0E0E0C" />
            </div>
            <p className="font-mono break-all">{joinUrl}</p>
          </div>
        )}
      </div>
    );
  } else if (!started) {
    body = (
      <button className="setup-start" onClick={newEvent}>
        <span>New event</span><span aria-hidden="true">↗</span>
      </button>
    );
  } else if (wa.status === "offline" || wa.status === "connecting") {
    // The bridge restarts after unlinking; give it a few seconds.
    body = (
      <div className="space-y-4 font-mono">
        <p className="uppercase">{wa.status === "offline" ? "WhatsApp bridge offline" : "Generating QR code…"}</p>
        {wa.status === "offline" && (
          <p className="text-sm opacity-60">
            If this hangs, start the bridge: <code>~/whatsapp-mcp/whatsapp-bridge/run-bridge.sh</code>
          </p>
        )}
      </div>
    );
  } else if (wa.status === "qr" && wa.qr) {
    body = (
      <div className="space-y-6">
        <p className={label}>Step 1 · Link WhatsApp</p>
        <div className="inline-block bg-fg p-5">
          <QRCodeSVG value={wa.qr} size={300} bgColor="#EDEAE2" fgColor="#0E0E0C" />
        </div>
        <p className="font-mono">WhatsApp → Settings → Linked devices → Link a device</p>
      </div>
    );
  } else {
    const groups = (wa.groups ?? []).filter((g) => g.name.toLowerCase().includes(filter.toLowerCase()));
    body = (
      <div className="space-y-6">
        <p className={label}>Step 2 · Pick the group chat</p>
        <input
          className="w-full border border-rule bg-transparent px-4 py-3 font-mono outline-none focus:border-fg"
          placeholder="Search groups"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {!wa.groups && <p className="font-mono uppercase">Loading groups…</p>}
        <ul className="divide-y divide-rule border-y border-rule">
          {groups.map((g) => (
            <li key={g.jid}>
              <button
                className="flex w-full justify-between px-2 py-4 text-left hover:bg-fg hover:text-bg"
                onClick={() => socket.emit("wa:pickGroup", { jid: g.jid, name: g.name })}
              >
                <span>{g.name || g.jid}</span>
                <span className="font-mono text-sm opacity-60">{g.size}</span>
              </button>
            </li>
          ))}
        </ul>
        <button className="font-mono text-sm uppercase underline opacity-60" onClick={() => socket.emit("wa:logout")}>
          Use a different WhatsApp account
        </button>
      </div>
    );
  }

  return (
    <main className="setup-page">
      <header className="setup-header"><a href="/" className="setup-wordmark">DEADLOCK<span className="setup-brand-dot" /></a><nav aria-label="Demo views"><a href="/stage">Stage ↗</a><a href="/join">Join</a><a href="/admin">Controls</a></nav></header>
      <div className="setup-layout">
        <section className="setup-copy">
          <p className="setup-eyebrow">Community signal box / London</p>
          <h1>Good plans.<br />No more<br /><span>deadlock.</span></h1>
          <p className="setup-description">The people are ready. The pieces just need to click.</p>
          <div className="setup-action-panel">{body}</div>
          <a className="setup-stage-link" href="/stage">Open the demo stage <span aria-hidden="true">→</span></a>
        </section>
        <div className="setup-art" aria-hidden="true">
          <div className="setup-machine">
            <div className="setup-machine-label"><span>DEADLOCK</span><span>INTERLOCKING</span></div>
            <div className="setup-machine-title"><span>DEAD</span><span>LOCK</span></div>
            <div className="setup-schematic"><i /><b /><i /><b /><i /></div>
            <div className="setup-machine-label"><span>PEOPLE</span><span>PLACE</span><span>PLAN</span></div>
            <div className="setup-vents">{Array.from({ length: 12 }, (_, i) => <span key={i} />)}</div>
            <span className="setup-screw screw-tl" /><span className="setup-screw screw-tr" /><span className="setup-screw screw-bl" /><span className="setup-screw screw-br" />
          </div>
          <p className="setup-art-caption">EVERY COMMITMENT. CONNECTED.</p>
        </div>
      </div>
      <footer className="setup-footer"><span>From “we should” to “we're on.”</span><span>BUILT FOR THE MOMENT IT CLICKS.</span></footer>
    </main>
  );
}
