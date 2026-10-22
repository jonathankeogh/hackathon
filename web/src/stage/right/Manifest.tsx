import type { Poll } from "@deadlock/shared/types";
import { plainCopy } from "../text/plainCopy";
import { alphas, colors, fonts, type, withAlpha } from "../tokens";

/** Rows for the manifest: who's coming, guests, maybes, then what they bring, most first. */
export function manifestRows(poll: Poll): [string, number][] {
  const yes = poll.answers.filter((a) => a.going === "yes");
  const bring = new Map<string, number>();
  for (const a of yes) for (const b of a.bring) if (b !== "Just me") bring.set(b, (bring.get(b) ?? 0) + 1);
  const rows: [string, number][] = [
    ["Confirmed", yes.length],
    ["Guests", yes.reduce((n, a) => n + a.guests, 0)],
    ["Maybe", poll.answers.filter((a) => a.going === "maybe").length],
    ...[...bring].sort((a, b) => b[1] - a[1]),
  ];
  return rows.filter(([, n]) => n > 0);
}

/**
 * What the phones said in the poll, as luggage tags: confirmed in green, then
 * guests, maybes and what people bring. A tag that changes rises in again.
 */
export function Manifest({ poll, max = 8 }: { poll: Poll; max?: number }) {
  const rows = manifestRows(poll).slice(0, max);
  if (!rows.length) return null;
  const mono = { fontFamily: fonts.mono, fontSize: type.small, fontWeight: 700 } as const;
  return (
    <section data-testid="manifest">
      <p style={{ ...mono, fontSize: type.label, margin: 0, color: withAlpha("text", alphas.read) }}>MANIFEST</p>
      <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 8 }}>
        {rows.map(([k, n], i) => (
          <li
            key={`${k}-${n}`}
            className="dl-rise"
            style={{ ...mono, display: "flex", gap: 10, padding: "6px 10px", border: `1px solid ${i === 0 ? colors.green : colors.divider}` }}
          >
            <span>{plainCopy(k).toUpperCase()}</span>
            <span style={{ color: i === 0 ? colors.green : colors.amber }}>{k === "Guests" ? `+${n}` : n}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
