import type { EventDetails, LineStatus, MeetExtras, TipKind, TravelRoute } from "@deadlock/shared/types";

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
      {event?.extras && <GoodToKnow extras={event.extras} />}
      {going !== undefined && <p className={`${label} mt-8`}>{going} going</p>}
    </div>
  );
}

const TIP_ROWS: [TipKind, string][] = [
  ["travel", "Getting there"],
  ["meetingPoint", "Meet"],
  ["weather", "Weather"],
  ["bring", "Bring"],
  ["wear", "Wear"],
];

/** Practical bits picked up from the chat, then things to do nearby. */
function GoodToKnow({ extras }: { extras: MeetExtras }) {
  const label = "font-mono text-[12px] uppercase tracking-[0.22em] text-fg/50";
  const rows = TIP_ROWS.map(([kind, name]) => {
    const sample = extras.weather?.source === "sample" ? " (sample forecast, offline)" : "";
    const tips = extras.tips
      .filter((t) => t.kind === kind)
      .map((t) => (t.label.startsWith("Forecast: ") ? t.label.slice(10) + sample : t.label.replace(/^Nearest: /, "")));
    // Kit reads as a list; sentences from the chat read one per line.
    return [name, kind === "bring" || kind === "wear" ? [tips.join(", ")].filter(Boolean) : tips] as const;
  }).filter(([, v]) => v.length);
  const routes = extras.routes ?? [];
  if (!rows.length && !extras.nearby.length && !routes.length) return null;
  return (
    <section data-testid="good-to-know" className="mt-8">
      <p className={label}>Good to know</p>
      {rows.length > 0 && (
        <dl className="mt-3 divide-y divide-rule border-y border-rule">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[108px_1fr] gap-3 py-3">
              <dt className={label}>{k}</dt>
              <dd className="text-[16px] leading-snug">
                {v.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {routes.length > 0 && <Routes routes={routes} lines={extras.lines ?? []} />}
      {extras.nearby.length > 0 && (
        <>
          <p className={`${label} mt-6`}>Nearby{extras.area ? ` in ${extras.area}` : ""}</p>
          <ol className="mt-3 space-y-2">
            {extras.nearby.map((n, i) => (
              <li key={n} className="grid grid-cols-[28px_1fr] text-[16px] leading-snug">
                <span className="font-mono text-fg/50">{String(i + 1).padStart(2, "0")}</span>
                <span>{n}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

const mins = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`);

/** Best ways in: each side of London, then nearby cities. Estimates are marked. */
function Routes({ routes, lines }: { routes: TravelRoute[]; lines: LineStatus[] }) {
  const label = "font-mono text-[12px] uppercase tracking-[0.22em] text-fg/50";
  const groups: [string, TravelRoute[]][] = [
    ["Getting there across London", routes.filter((r) => r.group === "london")],
    ["From nearby cities", routes.filter((r) => r.group === "city")],
  ];
  return (
    <>
      {groups
        .filter(([, list]) => list.length)
        .map(([title, list]) => (
          <div key={title} data-testid="routes">
            <p className={`${label} mt-6`}>{title}</p>
            <ul className="mt-3 divide-y divide-rule border-y border-rule">
              {list.map((r) => (
                <li key={r.from} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[15px] uppercase tracking-[0.04em]">{r.from}</span>
                    {r.minutes !== null && (
                      <span className="font-mono text-[15px] text-fg/70">
                        {r.live ? "" : "~"}
                        {mins(r.minutes)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[15px] leading-snug text-fg/70">{r.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      {routes.some((r) => !r.live) && <p className="mt-2 font-mono text-[11px] text-fg/50">~ estimate, live journey planner unavailable</p>}
      {lines.length > 0 && (
        <ul className="mt-4 space-y-1" data-testid="lines">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.04em]">
              <span className={`h-2 w-2 rounded-full ${l.good ? "bg-signal-green" : "bg-signal-amber"}`} />
              {l.name}: {l.status}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
