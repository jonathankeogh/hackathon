import type { CSSProperties } from "react";
import type { Milestone } from "@deadlock/shared/types";
import { SplitFlap } from "../components/SplitFlap";
import { plainCopy } from "../text/plainCopy";
import { alphas, colors, fonts, type, withAlpha } from "../tokens";

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** "DEADLOCK BROKEN IN 2:14", or null before the plan is booked. */
export function brokenIn(milestones: Milestone[]): string | null {
  const booked = milestones.find((m) => m.key === "booked");
  if (!booked || milestones.length < 2) return null;
  return `DEADLOCK BROKEN IN ${clock(booked.ts - milestones[0].ts)}`;
}

/**
 * Booked: how it happened, as a line of green signals with the time each one
 * went, under the total. Comes in after the train has run the line.
 */
export function Recap({ milestones, settled = false, delayS = 2.4 }: { milestones: Milestone[]; settled?: boolean; delayS?: number }) {
  const headline = brokenIn(milestones);
  if (!headline) return null;
  const start = milestones[0].ts;
  const fade = (d: number): { className?: string; style?: CSSProperties } => (settled ? {} : { className: "dl-fade", style: { "--dl-delay": `${d}s` } as CSSProperties });
  const step = 1 / milestones.length;
  return (
    <section data-testid="recap" style={{ position: "absolute", left: 56, right: 56, bottom: 36 }}>
      <div {...fade(delayS)}>
        <SplitFlap text={headline} size={type.body} fill={colors.green} stagger={0} />
      </div>
      <div style={{ position: "relative", height: 96, marginTop: 20 }}>
        <div className={settled ? undefined : "dl-sweep"} style={{ "--dl-delay": `${delayS + 0.3}s`, position: "absolute", left: 0, right: 0, top: 30, height: 2, background: colors.green } as CSSProperties} />
        {milestones.map((m, i) => {
          const f = fade(delayS + 0.4 + i * 0.12);
          return (
            <div key={m.key} {...f} style={{ ...f.style, position: "absolute", left: `${(i + 0.5) * step * 100}%`, top: 0, width: `${step * 100}%`, transform: "translateX(-50%)", textAlign: "center" }}>
              <div style={{ fontFamily: fonts.mono, fontSize: type.small, color: withAlpha("text", alphas.read) }}>+{clock(m.ts - start)}</div>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: colors.green, margin: "6px auto 0", border: `3px solid ${colors.bg}`, outline: `1px solid ${colors.green}` }} />
              <div style={{ marginTop: 8, fontSize: type.small, lineHeight: 1.25, padding: "0 4px" }}>{plainCopy(m.label)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
