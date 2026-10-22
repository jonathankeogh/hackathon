import { useEffect, useState } from "react";
import { socket } from "../socket";
import { useServerState } from "../useServerState";
import { CallScreen } from "./CallScreen";
import { Ticket } from "./Ticket";
import { AskCard } from "./AskCard";
import { NoticeBanner } from "./NoticeBanner";
import { SuggestionCard } from "./SuggestionCard";
import { PollCard } from "./PollCard";
import { LineStatus, Place } from "./Line";

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
  const [answered, setAnswered] = useState<string | null>(null);

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

  // The agent's question to this person, straight from state so a refresh keeps it.
  const myAsk = me ? state?.asks?.find((a) => a.personId === me.personId && a.status === "open" && a.id !== answered) : undefined;
  useEffect(() => {
    if (myAsk && (navigator.userActivation?.hasBeenActive ?? true)) navigator.vibrate?.([120, 80, 120]);
  }, [myAsk?.id]);

  // Every joined phone in the room turns green together when the line clears.
  const lineClear = Boolean(me && !invite && state?.plan?.status === "viable");
  useEffect(() => {
    if (lineClear && (navigator.userActivation?.hasBeenActive ?? true)) navigator.vibrate?.(300);
  }, [lineClear]);

  // The bot's plan ideas, before there is a plan. Buzz once when they arrive.
  const openSuggestion = !state?.plan && state?.suggestion?.status === "open" ? state.suggestion : null;
  useEffect(() => {
    if (openSuggestion && (navigator.userActivation?.hasBeenActive ?? true)) navigator.vibrate?.([120, 80, 120]);
  }, [openSuggestion?.id]);

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
      <main className="flex h-full flex-col px-7 pt-12 pb-10">
        <LineStatus state={state} />
        <form
          className="mt-auto space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || joining) return;
            setJoining(true);
            const next = { personId: "", name: name.trim() };
            save(next);
            socket.emit("join", { name: next.name });
          }}
        >
          <label className="block font-mono text-[12px] uppercase tracking-[0.24em] text-fg/50" htmlFor="name">
            Your first name
          </label>
          <input
            id="name"
            className="w-full border-b border-fg/40 bg-transparent pb-3 text-[40px] font-medium outline-none placeholder:text-fg/20 focus:border-fg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada"
            autoComplete="given-name"
            data-testid="name-input"
          />
          <p className="pb-4 text-[16px] text-fg/55">It goes up on the big screen when you join.</p>
          <button className={`${btn} border-fg`} type="submit" disabled={joining}>{joining ? "Joining…" : "Join"}</button>
        </form>
      </main>
    );
  }

  if (myAsk && me) {
    return (
      <AskCard
        ask={myAsk}
        onAnswer={(accept) => {
          setAnswered(myAsk.id);
          socket.emit("ask:answer", { askId: myAsk.id, accept, personId: me.personId });
        }}
      />
    );
  }

  if (lineClear) {
    return (
      <main className="flex h-full flex-col justify-between bg-signal-green px-7 pt-12 pb-12 text-bg" data-testid="line-clear">
        <p className="font-mono text-[12px] uppercase tracking-[0.24em]">Deadlock · Platform 1</p>
        <div>
          <p className="font-mono text-[64px] font-medium leading-[0.95] tracking-[0.02em]">LINE<br />CLEAR</p>
          <p className="mt-6 text-[20px] leading-snug">Every condition is met. Booking it now, your ticket is on its way.</p>
        </div>
        <span className="sr-only" data-testid="joined-as">You're in, {me.name}</span>
      </main>
    );
  }

  if (invite) {
    // Scrolls when the ticket is taller than the screen; centred when it isn't.
    return (
      <main className="h-full overflow-y-auto">
        <div className="flex min-h-full flex-col justify-center px-7 py-10">
          <span className="sr-only" data-testid="joined-as">You're in, {me.name}</span>
          <NoticeBanner notices={state?.notices} />
          <Ticket invite={invite} event={state?.event ?? null} going={state?.attendeeCount} />
        </div>
      </main>
    );
  }

  const roleLabel: Record<Role, string> = { attend: "I'm in", laptop: "Bringing a laptop", help: "Can help" };
  const poll = state?.plan && state.poll ? state.poll : null;
  return (
    <main className="h-full overflow-y-auto">
    <div className="flex min-h-full flex-col px-7 pt-12 pb-10">
      <LineStatus state={state} />
      <div className="mt-6">
        <NoticeBanner notices={state?.notices} />
      </div>
      {openSuggestion && (
        <div className="mt-6">
          <SuggestionCard
            suggestion={openSuggestion}
            personId={me.personId}
            onVote={(option) => socket.emit("suggest:vote", { personId: me.personId, option })}
          />
        </div>
      )}
      <div className="mt-auto">
        <h1 className="font-mono text-[13px] uppercase tracking-[0.22em] text-fg/55" data-testid="joined-as">
          You're in, {me.name}
        </h1>
        {state && <div className="mt-3"><Place state={state} personId={me.personId} /></div>}
        {poll ? (
          <div className="mt-8">
            <PollCard poll={poll} personId={me.personId} onAnswer={(a) => socket.emit("poll:answer", a)} />
          </div>
        ) : (
        <>
        <p className="mt-8 mb-3 font-mono text-[12px] uppercase tracking-[0.24em] text-fg/50">
          {role ? `Noted: ${roleLabel[role].toLowerCase()}` : "Anything else?"}
        </p>
        <div className="space-y-2.5">
          {(["attend", "laptop", "help"] as Role[]).map((r) => (
            <button
              key={r}
              className={`${btn} ${role === r ? "border-fg bg-fg text-bg" : ""}`}
              onClick={() => {
                setRole(r);
                socket.emit("rsvp", { personId: me.personId, role: r });
              }}
            >
              {roleLabel[r]}
            </button>
          ))}
        </div>
        </>
        )}
      </div>
    </div>
    </main>
  );
}
