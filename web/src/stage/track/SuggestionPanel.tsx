import { useEffect, useState, type CSSProperties } from "react";
import type { Person, PlanOption, Suggestion } from "@deadlock/shared/types";
import { SplitFlap } from "../components/SplitFlap";
import { PersonName } from "../components/PersonName";
import { relayClick } from "../sound/stageSound";
import { ClueText } from "../text/Clue";
import { plainCopy } from "../text/plainCopy";
import { alphas, colors, fonts, type, withAlpha } from "../tokens";
import { SignalLamp } from "./SignalLamp";

const KIND: Record<PlanOption["id"], string> = { live: "LIVE", venue: "BAR", area: "AREA" };
const LAMP_BOX = 40;

// The reveal, in seconds from the suggestion arriving. Clues are pulled out of the chat one
// by one, the award flips, then the options slide up. A reload shows the end state at once.
const PULL_AT = 0.25;
const PULL_STEP = 0.22;
const PULL_S = 0.9;
const optionsAt = (clues: number) => PULL_AT + Math.max(clues - 1, 0) * PULL_STEP + PULL_S + 0.75;

const label = (extra: CSSProperties = {}): CSSProperties => ({
  margin: 0,
  fontFamily: fonts.mono,
  fontSize: type.label,
  fontWeight: 700,
  color: withAlpha("text", alphas.read),
  ...extra,
});

/** Starts blank and flips to `text` after `afterS`, unless `settled`. */
function useDelayedText(text: string, afterS: number, settled: boolean) {
  const [shown, setShown] = useState(settled ? text : "");
  useEffect(() => {
    if (settled) return void setShown(text);
    const id = window.setTimeout(() => setShown(text), afterS * 1000);
    return () => window.clearTimeout(id);
  }, [text, afterS, settled]);
  return shown;
}

/**
 * Before anyone says "we should": the bot noticed a topic. The lines that gave it away
 * are pulled out of the chat into the middle, PLAN FOUND flips in like a departures
 * board, then three options stand as signals with live vote bars. The leader shows green.
 */
export function SuggestionPanel({ suggestion, people, settled = false }: { suggestion: Suggestion; people: Person[]; settled?: boolean }) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const clues = suggestion.evidence ?? [];
  const needed = suggestion.votesToPick ?? 3;
  const most = Math.max(...suggestion.options.map((o) => o.votes.length));
  const awardAt = PULL_AT + Math.max(clues.length - 1, 0) * PULL_STEP + PULL_S * 0.8;
  const award = useDelayedText("PLAN FOUND", awardAt, settled);

  // A relay click as each clue lands, and one as the award drops.
  useEffect(() => {
    if (settled) return;
    const ids = [...clues.map((_, i) => PULL_AT + i * PULL_STEP + PULL_S * 0.82), awardAt].map((s) => window.setTimeout(relayClick, s * 1000));
    return () => ids.forEach((id) => window.clearTimeout(id));
    // Once per suggestion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion.id, settled]);

  const anim = (cls: string, delayS: number, extra: CSSProperties = {}) =>
    settled ? { style: extra } : { className: cls, style: { "--dl-delay": `${delayS}s`, ...extra } as CSSProperties };

  return (
    <div data-testid="suggestion-panel" style={{ height: "100%", overflow: settled ? "hidden" : "visible", position: "relative", zIndex: 2, padding: "40px 56px", display: "flex", flexDirection: "column", gap: 30 }}>
      <header>
        <SplitFlap text={award} size={type.display} fill={award ? colors.amber : undefined} length={10} />
        <p {...anim("dl-fade", awardAt + 0.4, label({ marginTop: 14 }))}>
          {plainCopy(`${suggestion.topic}, ${suggestion.people.length} people talking, ${clues.length} ${clues.length === 1 ? "clue" : "clues"}`).toUpperCase()}
        </p>
      </header>

      {clues.length > 0 && (
        <ol data-testid="clues" style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 16 }}>
          {clues.map((c, i) => (
            <li
              key={c.messageId}
              {...anim("dl-pull", PULL_AT + i * PULL_STEP, {
                "--dl-from-x": "-600px",
                "--dl-from-y": `${380 + (i - (clues.length - 1)) * 110}px`,
                position: "relative",
                paddingLeft: 20,
                // Opaque, so a card in flight covers the chat it crosses.
                background: colors.bg,
              } as CSSProperties)}
            >
              <span style={{ position: "absolute", left: 0, top: 2, bottom: 2, width: 3, background: colors.amber }} />
              <PersonName person={byId.get(c.personId)} />
              <p style={{ margin: "4px 0 0", fontSize: type.body, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <ClueText text={c.text} keyword={c.keyword} delayS={settled ? 0 : PULL_AT + i * PULL_STEP + PULL_S} />
              </p>
            </li>
          ))}
        </ol>
      )}

      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
        {suggestion.options.map((o, i) => {
          const leading = o.votes.length > 0 && o.votes.length === most;
          const share = Math.min(1, o.votes.length / needed);
          return (
            <li
              key={o.id}
              data-testid={`suggestion-${o.id}`}
              {...anim("dl-slide", optionsAt(clues.length) + i * 0.15, { display: "flex", gap: 20, padding: "16px 0", borderTop: `1px solid ${colors.divider}` })}
            >
              <svg width={LAMP_BOX} height={LAMP_BOX} style={{ flex: "none", overflow: "visible", marginTop: 2 }}>
                <SignalLamp cx={LAMP_BOX / 2} cy={LAMP_BOX / 2} r={13} housingR={18} status={leading ? "green" : "amber"} />
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                  <span style={label({ flex: "none", width: 84 })}>
                    {i + 1} {KIND[o.id]}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: type.body, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{plainCopy(o.title)}</span>
                  <span data-testid={`votes-${o.id}`} style={{ flex: "none", fontFamily: fonts.mono, fontSize: type.body, fontWeight: 700, color: leading ? colors.green : colors.text }}>
                    {o.votes.length}/{needed}
                  </span>
                </div>
                <p style={label({ fontWeight: 400, fontSize: type.small, margin: "4px 0 0 100px" })}>{plainCopy(o.detail)}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0 0 100px" }}>
                  <div style={{ flex: 1, height: 6, background: colors.divider, position: "relative", overflow: "hidden" }}>
                    <div
                      style={{ position: "absolute", inset: 0, width: `${share * 100}%`, background: leading ? colors.green : colors.amber, transition: "width 0.4s cubic-bezier(0.3, 0, 0.15, 1)" }}
                    />
                  </div>
                  <span style={{ display: "flex", gap: 4, flex: "none", minWidth: 96, justifyContent: "flex-end" }}>
                    {o.votes.slice(0, 6).map((id) => {
                      const p = byId.get(id);
                      return (
                        <span
                          key={id}
                          className={settled ? undefined : "dl-fade-fast"}
                          title={p?.name}
                          style={{ width: 22, height: 22, background: p?.color ?? colors.divider, color: colors.bg, fontFamily: fonts.mono, fontSize: type.small, fontWeight: 700, display: "grid", placeItems: "center" }}
                        >
                          {(p?.name ?? "?").charAt(0).toUpperCase()}
                        </span>
                      );
                    })}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p {...anim("dl-fade", optionsAt(clues.length) + 0.7, label({ marginTop: "auto" }))}>REPLY 1, 2 OR 3 IN THE CHAT, OR VOTE ON YOUR PHONE</p>
    </div>
  );
}
