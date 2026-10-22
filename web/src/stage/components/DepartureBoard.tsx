import type { EventDetails, Plan } from "@deadlock/shared/types";
import type { CSSProperties } from "react";
import { wrapLines } from "../board/wrapLines";
import { plainCopy } from "../text/plainCopy";
import { alphas, colors, fonts, type, withAlpha } from "../tokens";
import { FlapLine } from "./FlapLine";

interface StatusView {
  text: string;
  /** Signal colour that fills the flap cells; none while there is no plan. */
  fill?: string;
}

export function statusView(plan: Plan | null): StatusView {
  switch (plan?.status) {
    case "blocked":
      return { text: "BLOCKED", fill: colors.red };
    case "viable":
      return { text: "VIABLE", fill: colors.green };
    case "booked":
      return { text: "BOOKED", fill: colors.green };
    default:
      return { text: "AWAITING PLAN" };
  }
}

export interface DepartureBoardProps {
  event: EventDetails;
  /** Flap font size in px. Cell width is about 0.66 of it. */
  size?: number;
  /** Cells per row. Longer text wraps onto up to MAX_LINES rows. */
  rowChars?: number;
  /** Delay between one row starting to flip and the next. */
  rowStepMs?: number;
  /** Delay before the first row starts, e.g. to wait out a cross-fade. */
  startMs?: number;
  /** Render fully flipped, with no animation (the board is already up when the page loads). */
  settled?: boolean;
}

const MAX_LINES = 3;
const GUTTER = 72;
const AGENDA_ITEMS = 4;

interface Section {
  label: string;
  lines: string[];
}

/** WHEN, WHERE, then 01-04 agenda items, each wrapped to flap rows. */
export function buildSections(event: EventDetails, rowChars: number): Section[] {
  const sections: Section[] = [
    { label: "WHEN", lines: wrapLines(plainCopy(event.when), rowChars, MAX_LINES) },
    { label: "WHERE", lines: wrapLines(plainCopy(event.where), rowChars, MAX_LINES) },
  ];
  event.agenda.slice(0, AGENDA_ITEMS).forEach((item, i) => {
    sections.push({ label: `0${i + 1}`, lines: wrapLines(plainCopy(item), rowChars, MAX_LINES) });
  });
  return sections;
}

const labelStyle = {
  width: GUTTER,
  flex: "none",
  fontFamily: fonts.mono,
  fontSize: type.label,
  fontWeight: 600,
  lineHeight: "29px",
  color: withAlpha("text", alphas.read),
} as const;

/** The event details as a departures board: label gutter on the left, flap rows on the right. */
export function DepartureBoard({ event, size = type.body, rowChars = 23, rowStepMs = 150, startMs = 350, settled = false }: DepartureBoardProps) {
  const sections = buildSections(event, rowChars);
  let row = 0;
  const blurbDelay = (startMs + sections.reduce((n, s) => n + s.lines.length, 0) * rowStepMs + 500) / 1000;
  return (
    <div data-testid="event-board" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {sections.map((section, i) => (
        <div key={section.label} style={{ display: "flex", borderTop: i === 2 ? `1px solid ${colors.divider}` : "none", paddingTop: i === 2 ? 32 : 0 }}>
          <span style={labelStyle}>{section.label}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {section.lines.map((line, k) => (
              <FlapLine key={k} text={line} size={size} delayMs={startMs + row++ * rowStepMs} settled={settled} />
            ))}
          </div>
        </div>
      ))}
      <p
        className={settled ? undefined : "dl-fade"}
        style={{ "--dl-delay": `${blurbDelay}s`, margin: "20px 0 0", fontFamily: fonts.sans, fontSize: type.body, lineHeight: 1.4, opacity: alphas.read } as CSSProperties}
      >
        {plainCopy(event.blurb)}
      </p>
    </div>
  );
}
