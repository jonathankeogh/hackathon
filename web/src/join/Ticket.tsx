import type { EventDetails } from "@deadlock/shared/types";

// The invite as a departures-board ticket, not a success card.

export function Ticket({ invite, event, going }: { invite: string; event: EventDetails | null; going?: number }) {
  const label = "font-mono text-[12px] uppercase tracking-[0.22em] text-fg/50";
  return (
    <div data-testid="invite">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.22em] text-signal-green">
          <span className="h-2.5 w-2.5 rounded-full bg-signal-green" />
          Booked
        </p>
        <p className={label}>Platform 1</p>
      </div>
      {event && <h2 className="mt-5 text-[34px] font-semibold leading-[1.1]">{event.title}</h2>}
      {event && (
        <dl className="mt-6 divide-y divide-rule border-y border-rule">
          {[
            ["When", event.when],
            ["Where", event.where],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[76px_1fr] gap-3 py-3.5">
              <dt className={label}>{k}</dt>
              <dd className="font-mono text-[17px] uppercase tracking-[0.04em]">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-6 text-[20px] leading-snug text-fg/85">{invite}</p>
      {going !== undefined && <p className={`${label} mt-8`}>{going} going</p>}
    </div>
  );
}
