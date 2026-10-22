import { useEffect, useRef, useState } from "react";
import type { Poll, PollAnswer } from "@deadlock/shared/types";
import { Button, Label, Stack } from "../design";
import "./join.css";

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

export interface PollCardProps {
  poll: Poll;
  personId: string;
  onAnswer: (answer: PollAnswer) => void;
}

export function PollCard({ poll, personId, onAnswer }: PollCardProps) {
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

  return (
    <section data-testid="poll" className="jn-poll" aria-label="Your answer">
      <Stack gap={12}>
        <Label strong>Are you coming?</Label>
        <div className="jn-poll-going">
          {GOING.map(([g, text]) => (
            <span key={g} data-testid={`going-${g}`} data-on={going === g || undefined} data-tone={g} className="jn-poll-going-cell">
              <Button
                block
                variant={going === g ? "primary" : "secondary"}
                onClick={() => {
                  tick();
                  setGoing(g);
                  if (g === "no") {
                    setBring([]);
                    setGuests(0);
                  }
                }}
              >
                {text}
              </Button>
            </span>
          ))}
        </div>
      </Stack>

      {going && going !== "no" ? (
        <Stack gap={12} className="jn-poll-rise">
          <Label strong>What are you bringing?</Label>
          <div className="jn-poll-chips">
            {poll.bringOptions.map((item) => {
              const on = bring.includes(item);
              return (
                <span key={item} data-testid={`bring-${item}`}>
                  <Button size="sm" variant={on ? "primary" : "secondary"} onClick={() => toggle(item)}>
                    {on && item !== JUST_ME ? "+ " : ""}
                    {item}
                  </Button>
                </span>
              );
            })}
          </div>
        </Stack>
      ) : null}

      {going === "yes" ? (
        <Stack gap={12} className="jn-poll-rise">
          <Label strong>Bringing anyone?</Label>
          <div className="jn-poll-stepper">
            <span data-testid="guests-minus">
              <Button size="sm" variant="secondary" disabled={guests === 0} onClick={() => (tick(), setGuests((n) => Math.max(0, n - 1)))}>
                −
              </Button>
            </span>
            <span className="jn-mono jn-poll-guests" data-testid="guests">
              {guests === 0 ? "Just me" : `+${guests} ${guests === 1 ? "guest" : "guests"}`}
            </span>
            <span data-testid="guests-plus">
              <Button size="sm" variant="secondary" disabled={guests === MAX_GUESTS} onClick={() => (tick(), setGuests((n) => Math.min(MAX_GUESTS, n + 1)))}>
                +
              </Button>
            </span>
          </div>
        </Stack>
      ) : null}

      <div className="jn-poll-foot">
        <Label>
          {yes.length} in{extra ? `, +${extra} ${extra === 1 ? "guest" : "guests"}` : ""}
        </Label>
        {saved > 0 ? (
          <Label key={saved} className="jn-poll-saved">
            Saved
          </Label>
        ) : null}
      </div>
    </section>
  );
}
