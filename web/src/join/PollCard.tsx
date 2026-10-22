import { useEffect, useRef, useState } from "react";
import type { Poll, PollAnswer } from "@deadlock/shared/types";

// Once there is a plan: are you coming, what are you bringing, anyone with
// you. Every tap saves; a short buzz confirms it. "Just me" stands alone.

type Going = PollAnswer["going"];
const JUST_ME = "Just me";
const MAX_GUESTS = 5;
const GOING: [Going, string][] = [
  ["yes", "I'm in"],
  ["maybe", "Maybe"],
  ["no", "Can't"],
];

const tick = () => {
  if (navigator.userActivation?.hasBeenActive ?? true) navigator.vibrate?.(12);
};

export function PollCard({ poll, personId, onAnswer }: { poll: Poll; personId: string; onAnswer: (a: PollAnswer) => void }) {
  const mine = poll.answers.find((a) => a.personId === personId);
  const [going, setGoing] = useState<Going | null>(mine?.going ?? null);
  const [bring, setBring] = useState<string[]>(mine?.bring ?? []);
  const [guests, setGuests] = useState(mine?.guests ?? 0);
  const [saved, setSaved] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) return void (first.current = false);
    if (!going) return;
    onAnswer({ personId, going, bring, guests });
    setSaved((n) => n + 1);
    // Save on every change of the answer itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [going, bring, guests]);

  const toggle = (item: string) => {
    tick();
    setBring((cur) => {
      if (item === JUST_ME) return cur.includes(JUST_ME) ? [] : [JUST_ME];
      const rest = cur.filter((b) => b !== JUST_ME);
      return rest.includes(item) ? rest.filter((b) => b !== item) : [...rest, item];
    });
  };

  const yes = poll.answers.filter((a) => a.going === "yes");
  const extra = yes.reduce((n, a) => n + a.guests, 0);
  const label = "font-mono text-[12px] uppercase tracking-[0.22em] text-fg/50";

  return (
    <section data-testid="poll" className="space-y-7">
      <div>
        <p className={label}>Are you coming?</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {GOING.map(([g, text]) => {
            const on = going === g;
            const tone = g === "yes" ? "border-signal-green bg-signal-green" : g === "maybe" ? "border-signal-amber bg-signal-amber" : "border-signal-red bg-signal-red";
            return (
              <button
                key={g}
                data-testid={`going-${g}`}
                onClick={() => {
                  tick();
                  setGoing(g);
                  if (g === "no") {
                    setBring([]);
                    setGuests(0);
                  }
                }}
                className={`border py-5 font-mono text-[17px] uppercase tracking-wider transition-colors ${on ? `${tone} text-bg` : "border-rule active:bg-fg/10"}`}
              >
                {text}
              </button>
            );
          })}
        </div>
      </div>

      {going && going !== "no" && (
        <div className="ph-rise">
          <p className={label}>What are you bringing?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {poll.bringOptions.map((item) => {
              const on = bring.includes(item);
              return (
                <button
                  key={item}
                  data-testid={`bring-${item}`}
                  onClick={() => toggle(item)}
                  className={`border px-4 py-3 text-[17px] transition-colors ${on ? "border-fg bg-fg text-bg" : "border-rule active:bg-fg/10"}`}
                >
                  {on && item !== JUST_ME ? "+ " : ""}
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {going === "yes" && (
        <div className="ph-rise">
          <p className={label}>Bringing anyone?</p>
          <div className="mt-3 flex items-center border border-rule">
            <button
              aria-label="One fewer guest"
              data-testid="guests-minus"
              disabled={guests === 0}
              onClick={() => {
                tick();
                setGuests((n) => Math.max(0, n - 1));
              }}
              className="h-16 w-16 font-mono text-[28px] disabled:text-fg/25 active:bg-fg/10"
            >
              −
            </button>
            <p className="flex-1 text-center font-mono text-[20px] uppercase tracking-wider" data-testid="guests">
              {guests === 0 ? "Just me" : `+${guests} ${guests === 1 ? "guest" : "guests"}`}
            </p>
            <button
              aria-label="One more guest"
              data-testid="guests-plus"
              disabled={guests === MAX_GUESTS}
              onClick={() => {
                tick();
                setGuests((n) => Math.min(MAX_GUESTS, n + 1));
              }}
              className="h-16 w-16 font-mono text-[28px] disabled:text-fg/25 active:bg-fg/10"
            >
              +
            </button>
          </div>
        </div>
      )}

      <p className={`${label} flex justify-between`}>
        <span>
          {yes.length} in{extra ? `, +${extra} guests` : ""}
        </span>
        {saved > 0 && (
          <span key={saved} className="ph-fade text-signal-green">
            Saved
          </span>
        )}
      </p>
    </section>
  );
}
