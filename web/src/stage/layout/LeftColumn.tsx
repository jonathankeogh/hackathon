import { useEffect, useMemo, useState } from "react";
import { ChatPanel } from "../chat/ChatPanel";
import { DepartureBoard } from "../components/DepartureBoard";
import type { EventDetails } from "@deadlock/shared/types";
import type { StateV2 } from "../data/v2types";

const FADE_S = 0.4;
const fade = (visible: boolean) => ({ opacity: visible ? 1 : 0, transition: `opacity ${FADE_S}s linear` }) as const;

/**
 * The left column: the community chat, cross-fading (opacity only, 400ms, a CSS transition
 * that always ends on its target) into the event departures board once the plan is booked and
 * event details exist. The board is kept mounted for the length of the fade-out.
 */
export function LeftColumn({ state, showEvent }: { state: StateV2; showEvent: boolean }) {
  const event = state.event;
  // Already booked when the page loaded: show the board as it is, with no fade or flip.
  const [fromStart, setFromStart] = useState(showEvent && event !== null);
  const [held, setHeld] = useState<EventDetails | null>(showEvent ? event : null);
  useEffect(() => {
    if (!showEvent) setFromStart(false);
    if (showEvent && event) {
      setHeld(event);
      return;
    }
    const id = window.setTimeout(() => setHeld(null), FADE_S * 1000 + 100);
    return () => window.clearTimeout(id);
  }, [showEvent, event]);
  const board = showEvent && event ? event : held;
  // While plans are on offer, the lines that gave the topic away light up.
  const evidence = !state.plan && state.suggestion?.status === "open" ? state.suggestion.evidence : undefined;
  const clues = useMemo(() => new Map((evidence ?? []).map((e) => [e.messageId, e.keyword])), [evidence]);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div aria-hidden={showEvent} style={{ position: "absolute", inset: 0, ...fade(!showEvent) }}>
        <ChatPanel messages={state.messages} people={state.people} commitments={state.commitments} label={state.chatSource?.label} clues={clues} />
      </div>
      {board && (
        <div className={fromStart ? undefined : "dl-fade-slow"} style={{ position: "absolute", inset: 0, padding: "64px 32px 40px", pointerEvents: "none", ...fade(showEvent && event !== null) }}>
          <DepartureBoard event={board} settled={fromStart} />
        </div>
      )}
    </div>
  );
}
