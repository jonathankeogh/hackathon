import type { Person, Suggestion } from "@deadlock/shared/types";
import { plainCopy } from "../text/plainCopy";
import { alphas, colors, fonts, type, withAlpha } from "../tokens";
import { SignalLamp } from "./SignalLamp";

const KIND: Record<Suggestion["options"][number]["id"], string> = { live: "LIVE", venue: "BAR", area: "AREA" };
const LAMP_BOX = 40;
const HOUSING_R = 18;
const LAMP_R = 13;

/**
 * Before anyone says "we should": the bot noticed a topic and offers three
 * plans as three signals. The one with the most votes shows green.
 */
export function SuggestionPanel({ suggestion, people }: { suggestion: Suggestion; people: Person[] }) {
  const names = suggestion.people.map((id) => people.find((p) => p.id === id)?.name ?? "someone");
  const most = Math.max(...suggestion.options.map((o) => o.votes.length));
  return (
    <div data-testid="suggestion-panel" className="dl-rise" style={{ padding: "64px 56px", display: "flex", flexDirection: "column", gap: 40 }}>
      <div>
        <p style={{ margin: 0, fontFamily: fonts.mono, fontSize: type.label, fontWeight: 700, color: withAlpha("text", alphas.read) }}>
          {suggestion.topic.toUpperCase()}, {names.length} PEOPLE TALKING
        </p>
        <p style={{ margin: "14px 0 0", fontFamily: fonts.sans, fontSize: type.title, lineHeight: 1.3, fontWeight: 500, color: colors.text }}>
          {plainCopy(`${names.slice(0, 4).join(", ")}${names.length > 4 ? " and more" : ""}. Pick a plan:`)}
        </p>
      </div>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
        {suggestion.options.map((o, i) => {
          const leading = o.votes.length > 0 && o.votes.length === most;
          return (
            <li key={o.id} data-testid={`suggestion-${o.id}`} style={{ display: "flex", gap: 24, padding: "28px 0", borderTop: `1px solid ${colors.divider}` }}>
              <svg width={LAMP_BOX} height={LAMP_BOX} style={{ flex: "none", overflow: "visible" }}>
                <SignalLamp cx={LAMP_BOX / 2} cy={LAMP_BOX / 2} r={LAMP_R} housingR={HOUSING_R} status={leading ? "green" : "amber"} />
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.mono, fontSize: type.label, fontWeight: 700 }}>
                  <span style={{ color: withAlpha("text", alphas.read) }}>
                    {i + 1} {KIND[o.id]}
                  </span>
                  <span style={{ color: leading ? colors.green : withAlpha("text", alphas.read) }}>
                    {o.votes.length} {o.votes.length === 1 ? "VOTE" : "VOTES"}
                  </span>
                </div>
                <p style={{ margin: "8px 0 0", fontFamily: fonts.sans, fontSize: type.title, lineHeight: 1.2, fontWeight: 500, color: colors.text }}>{plainCopy(o.title)}</p>
                <p style={{ margin: "6px 0 0", fontFamily: fonts.mono, fontSize: type.small, lineHeight: 1.4, color: withAlpha("text", alphas.read) }}>{plainCopy(o.detail)}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p style={{ margin: 0, fontFamily: fonts.mono, fontSize: type.label, color: withAlpha("text", alphas.read) }}>REPLY 1, 2 OR 3, OR VOTE ON YOUR PHONE</p>
    </div>
  );
}
