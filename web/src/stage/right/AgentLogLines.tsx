import { useStageScale } from "../layout/StageScale";
import { colors, fonts } from "../tokens";
import { plainCopy } from "../text/plainCopy";
import { LOG_LINES, lineOpacity, visibleLines } from "./agentLog";
import { useTypedLength } from "./useTimed";

export const LOG_LINE_H = 26;

function Line({ text, opacity, fresh }: { text: string; opacity: number; fresh: boolean }) {
  const { label, phone } = useStageScale();
  const shown = useTypedLength(text, fresh);
  return (
    <div
      data-testid="agent-log-line"
      className={fresh ? "dl-fade" : undefined}
      style={{
        opacity,
        transition: "opacity 0.2s linear",
        // The projector log is fixed height and one line each; on a phone a long line wraps.
        ...(phone ? { lineHeight: 1.35, overflowWrap: "anywhere" as const } : { height: LOG_LINE_H, lineHeight: `${LOG_LINE_H}px`, whiteSpace: "nowrap" as const, overflow: "hidden" }),
        fontFamily: fonts.mono,
        fontSize: label,
        fontWeight: 600,
        color: colors.text,
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
  const { phone } = useStageScale();
  return (
    <div style={{ ...(phone ? { gap: 6 } : { height: LOG_LINES * LOG_LINE_H, overflow: "hidden" }), display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      {visibleLines(log).map((l) => (
        <Line key={l.index} text={l.text} opacity={lineOpacity(l.rank)} fresh={l.index >= freshFrom} />
      ))}
    </div>
  );
}
