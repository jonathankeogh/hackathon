import { useEffect, useState } from "react";
import { socket } from "../socket";
import { useServerState } from "../useServerState";
import { CallScreen } from "./CallScreen";
import { Ticket } from "./Ticket";

// Plain functional phone view (#4). Person 4 replaces the screens; keep the
// join/reconnect wiring.

const KEY = "deadlock.phone";
type Saved = { personId: string; name: string };
type Role = "attend" | "laptop" | "help";

function load(): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

function save(v: Saved | null) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked (private mode): the phone just won't survive a refresh
  }
}

export default function JoinPage() {
  const { state } = useServerState();
  const [me, setMe] = useState<Saved | null>(() => (load()?.personId ? load() : null));
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [call, setCall] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    // Reattach silently on every (re)connect.
    const rejoin = () => {
      const saved = load();
      if (saved) socket.emit("join", saved);
    };
    const onJoined = ({ personId }: { personId: string }) => {
      setMe((prev) => {
        const next = { personId, name: prev?.name ?? load()?.name ?? "" };
        save(next);
        return next;
      });
    };
    const onInvite = ({ text }: { text: string }) => {
      setInvite(text);
      // Browsers block vibrate before the first tap (e.g. right after a refresh).
      if (navigator.userActivation?.hasBeenActive ?? true) navigator.vibrate?.([200, 100, 200]);
    };
    const onCall = ({ script }: { script: string }) => setCall(script);

    if (socket.connected) rejoin();
    socket.on("connect", rejoin);
    socket.on("joined", onJoined);
    socket.on("invite", onInvite);
    socket.on("call", onCall);
    return () => {
      socket.off("connect", rejoin);
      socket.off("joined", onJoined);
      socket.off("invite", onInvite);
      socket.off("call", onCall);
    };
  }, []);

  // After an admin reset our id is gone: go back to the join screen.
  useEffect(() => {
    if (me && state && !state.people.some((p) => p.id === me.personId)) {
      save(null);
      setMe(null);
      setRole(null);
      setInvite(null);
      setJoining(false);
      setCall(null);
      window.speechSynthesis?.cancel();
    }
  }, [me, state]);

  const btn = "w-full border border-rule py-6 font-mono text-xl uppercase tracking-wider active:bg-fg active:text-bg";

  if (call) {
    return (
      <CallScreen
        key={call}
        script={call}
        onDone={() => {
          window.speechSynthesis?.cancel();
          setCall(null);
        }}
      />
    );
  }

  if (!me) {
    return (
      <main className="flex h-full flex-col justify-center gap-6 p-6">
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-fg/60">Deadlock</p>
        <h1 className="text-4xl font-semibold">What's your first name?</h1>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || joining) return;
            setJoining(true);
            const next = { personId: "", name: name.trim() };
            save(next);
            socket.emit("join", { name: next.name });
          }}
        >
          <input
            className="w-full border border-rule bg-transparent p-5 text-2xl outline-none focus:border-fg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name"
            autoComplete="given-name"
            data-testid="name-input"
          />
          <button className={btn} type="submit" disabled={joining}>{joining ? "Joining…" : "Join"}</button>
        </form>
      </main>
    );
  }

  if (invite) {
    return (
      <main className="flex h-full flex-col justify-center px-7 py-10">
        <span className="sr-only" data-testid="joined-as">You're in, {me.name}</span>
        <Ticket invite={invite} event={state?.event ?? null} going={state?.attendeeCount} />
      </main>
    );
  }

  return (
    <main className="flex h-full flex-col justify-center gap-6 p-6">
      <p className="font-mono text-sm uppercase tracking-[0.2em] text-fg/60">
        {state ? `${state.attendeeCount}/${state.attendeeTarget} in` : ""}
      </p>
      <h1 className="text-4xl font-semibold" data-testid="joined-as">You're in, {me.name}</h1>
      <div className="space-y-3">
          {(["attend", "laptop", "help"] as Role[]).map((r) => (
            <button
              key={r}
              className={`${btn} ${role === r ? "bg-fg text-bg" : ""}`}
              onClick={() => {
                setRole(r);
                socket.emit("rsvp", { personId: me.personId, role: r });
              }}
            >
              {{ attend: "I'm in", laptop: "Bringing a laptop", help: "Can help" }[r]}
            </button>
          ))}
      </div>
    </main>
  );
}
