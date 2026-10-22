import type { State } from "@deadlock/shared/types";

// What the stage is showing, in one line at the top of the phone.

export function LineStatus({ state }: { state: State | null }) {
  const status = state?.plan?.status ?? "none";
  const short = state ? Math.max(0, state.attendeeTarget - state.attendeeCount) : 0;
  const [text, lamp] =
    status === "blocked"
      ? [`Held at signal${short ? ` · ${short} more needed` : ""}`, "bg-signal-red"]
      : status === "viable"
        ? ["Line clear", "bg-signal-green"]
        : status === "booked"
          ? ["Booked", "bg-signal-green"]
          : ["Waiting for a plan", "bg-fg/30"];
  return (
    <div>
      <p className="font-mono text-[12px] uppercase tracking-[0.24em] text-fg/45">Deadlock · Platform 1</p>
      {state?.plan && <p className="mt-3 text-[22px] font-semibold leading-tight">{state.plan.title}</p>}
      <p className="mt-2 flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.18em] text-fg/75">
        <span className={`h-2.5 w-2.5 rounded-full ${lamp}`} />
        {text}
      </p>
    </div>
  );
}

/** "#13 of 15" with this person's slot lit on the meter. */
export function Place({ state, personId }: { state: State; personId: string }) {
  const phones = state.people.filter((p) => p.source === "phone");
  const idx = phones.findIndex((p) => p.id === personId);
  const place = idx < 0 ? state.attendeeCount : state.attendeeCount - phones.length + idx + 1;
  const slots = Array.from({ length: state.attendeeTarget }, (_, i) => i);
  return (
    <div>
      <p className="flex items-end gap-3 font-mono leading-none">
        <span className="text-[88px] font-medium">#{place}</span>
        <span className="pb-2 text-[22px] text-fg/45">of {state.attendeeTarget}</span>
      </p>
      <div className="mt-4 flex gap-[3px]">
        {slots.map((i) => (
          <span
            key={i}
            className={`h-3 flex-1 ${i === place - 1 ? "bg-signal-green" : i < state.attendeeCount ? "bg-fg/70" : "bg-fg/10"}`}
          />
        ))}
      </div>
    </div>
  );
}
