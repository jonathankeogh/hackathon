import { useEffect, useState } from "react";
import type { EventDetails } from "@deadlock/shared/types";
import { SplitFlap } from "../components/SplitFlap";
import { plainCopy } from "../text/plainCopy";
import { alphas, colors, fonts, type, withAlpha } from "../tokens";

const pad = (n: number) => String(n).padStart(2, "0");

/** "6D 04:12:33" until the start; "DEPARTING" once it has passed. */
export function countdown(startsAt: string, now: number): string {
  const ms = Date.parse(startsAt) - now;
  if (!(ms > 0)) return "DEPARTING";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const clock = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return d > 0 ? `${d}D ${clock}` : clock;
}

/** Booked: a departures-board countdown to the start, ticking a flap a second. */
export function Departs({ event }: { event: EventDetails }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!event.startsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [event.startsAt]);
  const label = { margin: 0, fontFamily: fonts.mono, fontSize: type.label, fontWeight: 700, color: withAlpha("text", alphas.read) } as const;
  return (
    <section data-testid="departs" className="dl-rise">
      <p style={label}>{event.startsAt ? "DEPARTS IN" : "DEPARTS"}</p>
      <div style={{ marginTop: 12 }}>
        <SplitFlap text={event.startsAt ? countdown(event.startsAt, now) : plainCopy(event.when).toUpperCase()} size={type.title} fill={colors.green} stagger={0} />
      </div>
      <p style={{ ...label, fontWeight: 400, fontSize: type.small, marginTop: 12 }}>{plainCopy(`${event.when}, ${event.where}`).toUpperCase()}</p>
    </section>
  );
}
