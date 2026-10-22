import type { LineStatus, MeetExtras, TipKind, TravelRoute } from "@deadlock/shared/types";
import { Label, SignalLamp, Text } from "../design";
import "./join.css";

const TIP_ROWS: [TipKind, string][] = [
  ["travel", "Getting there"],
  ["meetingPoint", "Meet"],
  ["weather", "Weather"],
  ["bring", "Bring"],
  ["wear", "Wear"],
];

/** The tip rows that have something to say. Kit reads as a list; chat sentences one per line. */
export function tipRows(extras: MeetExtras): [string, string[]][] {
  return TIP_ROWS.map(([kind, name]): [string, string[]] => {
    const sample = extras.weather?.source === "sample" ? " (sample forecast, offline)" : "";
    const tips = extras.tips
      .filter((t) => t.kind === kind)
      .map((t) => (t.label.startsWith("Forecast: ") ? t.label.slice(10) + sample : t.label.replace(/^Nearest: /, "")));
    return [name, kind === "bring" || kind === "wear" ? [tips.join(", ")].filter(Boolean) : tips];
  }).filter(([, v]) => v.length);
}

const mins = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`);

/** Practical bits picked up from the chat, then things to do nearby. */
export function GoodToKnow({ extras }: { extras: MeetExtras }) {
  const rows = tipRows(extras);
  const routes = extras.routes ?? [];
  if (!rows.length && !extras.nearby.length && !routes.length) return null;
  return (
    <section data-testid="good-to-know" className="jn-know">
      <Label strong>Good to know</Label>
      {rows.length > 0 && (
        <ul className="jn-tips">
          {rows.map(([k, v]) => (
            <li key={k} className="jn-tip">
              <Label>{k}</Label>
              <span className="jn-tip-text">
                {v.map((line) => (
                  <Text key={line}>{line}</Text>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
      {routes.length > 0 && <Routes routes={routes} lines={extras.lines ?? []} />}
      {extras.nearby.length > 0 && (
        <>
          <Label>{`Nearby${extras.area ? ` in ${extras.area}` : ""}`}</Label>
          <ol className="jn-tips">
            {extras.nearby.map((n, i) => (
              <li key={n} className="jn-tip" data-narrow="true">
                <Label>{String(i + 1).padStart(2, "0")}</Label>
                <Text>{n}</Text>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

/** Best ways in: each side of London, then nearby cities. Estimates are marked. */
function Routes({ routes, lines }: { routes: TravelRoute[]; lines: LineStatus[] }) {
  const groups: [string, TravelRoute[]][] = [
    ["Getting there across London", routes.filter((r) => r.group === "london")],
    ["From nearby cities", routes.filter((r) => r.group === "city")],
  ];
  return (
    <>
      {groups
        .filter(([, list]) => list.length)
        .map(([title, list]) => (
          <div key={title} data-testid="routes" className="jn-know">
            <Label>{title}</Label>
            <ul className="jn-tips">
              {list.map((r) => (
                <li key={r.from} className="jn-tip" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
                  <span className="jn-route-head">
                    <Label strong>{r.from}</Label>
                    {r.minutes !== null && (
                      <Label>
                        {r.live ? "" : "~"}
                        {mins(r.minutes)}
                      </Label>
                    )}
                  </span>
                  <Text muted>{r.summary}</Text>
                </li>
              ))}
            </ul>
          </div>
        ))}
      {routes.some((r) => !r.live) && <Text size="small" muted>~ estimate, live journey planner unavailable</Text>}
      {lines.length > 0 && (
        <ul className="jn-tips" data-testid="lines">
          {lines.map((l) => (
            <li key={l.id} className="jn-line">
              <SignalLamp state={l.good ? "green" : "amber"} size="sm" label={l.good ? "Good service" : "Disrupted"} />
              <Text>
                {l.name}: {l.status}
              </Text>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
