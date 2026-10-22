import { useState } from "react";
import { socket } from "../socket";
import { useServerState } from "../useServerState";

// Plain admin controls; #7 finishes this. Every step is forceable from here.

const STEPS = ["detect", "extract", "explain", "cascade", "book", "call"] as const;

export default function AdminPage() {
  const { state, connected } = useServerState();
  const [personId, setPersonId] = useState("p-host");
  const [text, setText] = useState("");
  const btn = "border border-rule px-4 py-3 font-mono uppercase active:bg-fg active:text-bg";
  if (!state) return <p className="p-6 font-mono">{connected ? "Waiting for state" : "Connecting"}</p>;
  const phones = state.people.filter((p) => p.source === "phone");

  return (
    <main className="mx-auto max-w-xl space-y-8 p-6 font-mono">
      <p className="text-sm uppercase" data-testid="admin-status">
        {connected ? "live" : "disconnected"} · plan {state.plan?.status ?? "none"} · attendees{" "}
        <span data-testid="admin-count">{state.attendeeCount}</span>/{state.attendeeTarget} · phones {phones.length}
      </p>

      <section className="flex flex-wrap gap-2">
        <button className={btn} onClick={() => socket.emit("admin:reset")}>Reset</button>
        <button className={btn} onClick={() => socket.emit("admin:seed")}>Re-seed</button>
        <button className={btn} onClick={() => socket.emit("admin:simulateJoins", { count: 20 })}>Simulate 20 joins</button>
        <button className={btn} onClick={() => socket.emit("admin:mock", { on: !state.mock })}>
          Mock {state.mock ? "on" : "off"}
        </button>
      </section>

      <section className="space-y-2">
        <p className="text-sm uppercase text-fg/60">Force a step</p>
        <div className="flex flex-wrap gap-2">
          {STEPS.map((s) => (
            <button key={s} className={btn} onClick={() => socket.emit("admin:step", { step: s })}>{s}</button>
          ))}
        </div>
      </section>

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          socket.emit("chat:send", { personId, text });
          setText("");
        }}
      >
        <p className="text-sm uppercase text-fg/60">Send chat as</p>
        <select className="w-full border border-rule bg-bg p-3" value={personId} onChange={(e) => setPersonId(e.target.value)}>
          {state.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input
          className="w-full border border-rule bg-transparent p-3"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="we should run a hands-on Grok agents workshop next week"
          data-testid="chat-input"
        />
        <button className={btn} type="submit">Send</button>
      </form>

      <section className="space-y-2">
        <p className="text-sm uppercase text-fg/60">Who gets the call</p>
        <select
          className="w-full border border-rule bg-bg p-3"
          defaultValue=""
          onChange={(e) => socket.emit("admin:callTarget", { personId: e.target.value })}
        >
          <option value="">Most recent phone</option>
          {phones.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </section>
    </main>
  );
}
