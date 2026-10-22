import { colors, fonts, type } from "../tokens";
import { plainCopy } from "../text/plainCopy";
import { LOG_LINES, lineOpacity, visibleLines } from "./agentLog";
import { useTypedLength } from "./useTimed";

export const LOG_LINE_H = 26;

function Line({ text, opacity, fresh }: { text: string; opacity: number; fresh: boolean }) {
  const shown = useTypedLength(text, fresh);
  return (
    <div
      data-testid="agent-log-line"
      className={fresh ? "dl-fade" : undefined}
      style={{
        opacity,
        transition: "opacity 0.2s linear",
        height: LOG_LINE_H,
        lineHeight: `${LOG_LINE_H}px`,
        fontFamily: fonts.mono,
        fontSize: type.label,
        fontWeight: 600,
        color: colors.text,
        whiteSpace: "nowrap",
        overflow: "hidden",
        flex: "none",
      }}
    >
      {plainCopy(text).slice(0, shown)}
    </div>
  );
}

interface Props {
  log: readonly string[];
  /** Lines at or after this index are new since the stage loaded and type in. */
  freshFrom: number;
}

/** Newest line at the bottom, older lines stepping down in opacity. Fixed height, so nothing shifts. */
export function AgentLog({ log, freshFrom }: Props) {
  return (
    <div style={{ height: LOG_LINES * LOG_LINE_H, display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
      {visibleLines(log).map((l) => (
        <Line key={l.index} text={l.text} opacity={lineOpacity(l.rank)} fresh={l.index >= freshFrom} />
      ))}
    </div>
  );
}
