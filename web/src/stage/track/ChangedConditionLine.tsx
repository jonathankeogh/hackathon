import { useStageScale } from "../layout/StageScale";
import { alphas, colors, fonts, withAlpha } from "../tokens";
import type { ChangedCondition } from "./conditionDiff";

export const CONDITION_LINE_H = 26;

/**
 * The relaxed condition on a signal: the old one struck through at 60% foreground, then the
 * new one in the foreground colour on a small amber-filled plate (amber is a fill, never text).
 * The strike draws left to right, mechanically (`animate` false once the label has settled,
 * so a settle remount does not replay it).
 */
export function ChangedConditionLine({ change, animate = true }: { change: ChangedCondition; animate?: boolean }) {
  const scale = useStageScale();
  return (
    <div
      data-testid="changed-condition"
      className={animate ? "dl-fade" : undefined}
      style={{ display: "flex", alignItems: "center", gap: 10, height: CONDITION_LINE_H, fontFamily: fonts.mono, fontSize: scale.label, fontWeight: 600, whiteSpace: "nowrap" }}
    >
      <span data-testid="changed-condition-from" style={{ position: "relative", color: withAlpha("text", alphas.read) }}>
        {change.from}
        <span
          className={animate ? "dl-strike" : undefined}
          style={{ position: "absolute", left: 0, right: 0, top: "55%", height: 2, background: withAlpha("text", alphas.read), transformOrigin: "left" }}
        />
      </span>
      <span data-testid="changed-condition-to" style={{ padding: "0 8px", lineHeight: `${CONDITION_LINE_H - 2}px`, background: colors.amber, color: colors.bg }}>
        {change.to}
      </span>
    </div>
  );
}
