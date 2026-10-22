import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { socket } from "../socket";

// Setup without a terminal: Sign up → scan the WhatsApp link QR → done.
// Then @deadlock in any chat starts a plan there. Plain on purpose; Person 4 restyles (#41).

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
  // Until "New Event" is clicked we only show the button (or a running event).
  const [started, setStarted] = useState(false);
  const newEvent = () => {
    setStarted(true);
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
        <p className="font-mono opacity-60">Someone tagged @deadlock here. Updates post back into the chat.</p>
        <div className="flex flex-wrap gap-4">
          <a className={btn} href="/stage" target="_blank" rel="noreferrer">Open stage</a>
          <button className={btn} onClick={newEvent}>Sign up again</button>
        </div>
      </div>
    );
  } else if (!started) {
    body = (
      <button className="w-full border border-fg py-10 font-mono text-3xl uppercase tracking-[0.2em] hover:bg-fg hover:text-bg" onClick={newEvent}>
        Sign up
      </button>
    );
  } else if (wa.status === "offline" || wa.status === "connecting") {
    // The bridge restarts after unlinking; give it a few seconds.
    body = (
      <div className="space-y-4 font-mono">
        <p className="uppercase">Generating QR code…</p>
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
    // Linked. No group picking: tagging @deadlock in any chat starts a plan there.
    body = (
      <div className="space-y-8">
        <p className={label}>Done</p>
        <h2 className="text-4xl">Sign up complete!</h2>
        <p className="text-xl leading-relaxed">
          Type <span className="font-mono text-signal-amber">@deadlock</span> in any WhatsApp group when a plan is
          stuck. Deadlock reads the chat, works out who's waiting on whom, and posts the link to watch it unlock.
        </p>
        <a className={btn + " inline-block"} href="/stage" target="_blank" rel="noreferrer">Open stage</a>
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-full max-w-2xl px-4 py-10">
      <h1 className="mb-10 font-mono text-3xl font-semibold uppercase tracking-[0.2em]">Deadlock</h1>
      {body}
    </main>
  );
}
