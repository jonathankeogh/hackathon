import { DepartureBoard, boardGutter } from "../components/DepartureBoard";
import type { EventDetails } from "@deadlock/shared/types";
import { useElementWidth } from "../layout/useElementWidth";

const FLAP_SIZE = 16;
const FLAP_GAP = 3;
const MIN_CHARS = 14;
const MAX_CHARS = 26;

/** Flap cells that fit one row beside the label gutter, so the board never runs off a phone. */
export function rowCharsFor(width: number, size = FLAP_SIZE): number {
  const cell = Math.round(size * 0.66) + FLAP_GAP;
  return Math.max(MIN_CHARS, Math.min(MAX_CHARS, Math.floor((width - boardGutter(true)) / cell)));
}

/** The event (when, where, agenda) as a departures board sized to the phone's width. */
export function PhoneEventBoard({ event, settled }: { event: EventDetails; settled: boolean }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(358);
  return (
    <section data-testid="phone-event" className="stage-phone-section">
      <div ref={ref} className={settled ? undefined : "dl-fade-slow"}>
        <DepartureBoard event={event} size={FLAP_SIZE} rowChars={rowCharsFor(width)} settled={settled} startMs={200} rowStepMs={120} />
      </div>
    </section>
  );
}
