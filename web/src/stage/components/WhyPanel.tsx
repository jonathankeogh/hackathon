import { Fragment } from "react";
import { plainCopy } from "../text/plainCopy";
import { alphas, colors, fonts, type, withAlpha } from "../tokens";
import { splitWords, useWordReveal } from "./useWordReveal";

export interface WhyPanelProps {
  /** Full explanation, from state.explanation. */
  text: string;
  /** Raw concatenated explain:chunk text while streaming, otherwise null. */
  streaming: string | null;
  /** True when the plan is viable or booked. */
  resolved: boolean;
  /** Body text size in px. */
  size?: number;
}

export function WhyPanel({ text, streaming, resolved, size = type.title }: WhyPanelProps) {
  const cleanText = plainCopy(text);
  const cleanStreaming = streaming === null ? null : plainCopy(streaming);
  const words = splitWords(cleanStreaming ?? cleanText);
  const visible = useWordReveal(cleanText, cleanStreaming);
  // Rule zero: with nothing to explain (no plan yet) the heading is not shown either.
  if (!resolved && words.length === 0) return null;
  return (
    <div className="flex flex-col gap-5">
      <div style={{ fontFamily: fonts.mono, fontSize: type.label, fontWeight: 600, color: withAlpha("text", alphas.read) }}>
        WHY IT'S STUCK
      </div>
      {resolved ? (
        <p data-testid="plan-go" className="m-0 flex items-start gap-4 font-sans font-medium leading-[1.3] text-fg" style={{ fontSize: size }}>
          <span aria-hidden style={{ width: 24, height: 24, flex: "none", marginTop: 8, borderRadius: "50%", background: colors.green }} />
          NOTHING. THE PLAN IS GO.
        </p>
      ) : (
        <p className="m-0 font-sans leading-[1.3] text-fg" style={{ fontSize: size }}>
          {words.slice(0, visible).map((word, i) => (
            <Fragment key={i}>
              {i > 0 ? " " : null}
              <span className="dl-fade-fast inline-block">{word}</span>
            </Fragment>
          ))}
        </p>
      )}
    </div>
  );
}
