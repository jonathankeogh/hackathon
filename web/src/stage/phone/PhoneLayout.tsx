import { useState } from "react";
import type { CascadeSnapshot } from "../cascade/sequencer";
import type { StateV2 } from "../data/v2types";
import { PhoneScale } from "../layout/StageScale";
import { useElementWidth } from "../layout/useElementWidth";
import { PORTRAIT_DEFAULT_W } from "../track/layout";
import { displayedPlan } from "../track/lampState";
import { SuggestionPanel } from "../track/SuggestionPanel";
import { Recap } from "../track/Recap";
import { Departs } from "../right/Departs";
import { Manifest, manifestRows } from "../right/Manifest";
import { TrackPanel } from "../track/TrackPanel";
import { AgentPanel } from "../right/AgentPanel";
import { hasAgentActivity, shownAsks } from "../right/agentLog";
import { WhyPanel } from "../components/WhyPanel";
import { PhoneChat } from "./PhoneChat";
import { PhoneEventBoard } from "./PhoneEventBoard";
import { PhoneHeader } from "./PhoneHeader";
import { PhoneJoin } from "./PhoneJoin";

interface Props {
  state: StateV2;
  cascade: CascadeSnapshot;
  streaming: string | null;
}

/**
 * The phone layout: one column in natural page scroll. Sticky header, the event board once
 * booked, the track running top to bottom, the agent, why it is stuck, the counter with a
 * Join button, and the chat last. It reads the same state, cascade and stream as the
 * projector layout; only the arrangement and sizes differ.
 */
export function PhoneLayout({ state, cascade, streaming }: Props) {
  const plan = displayedPlan(state.plan, cascade.planLit);
  const resolved = plan?.status === "viable" || plan?.status === "booked";
  const showEvent = plan?.status === "booked" && state.event !== null;
  // Already booked when the page loaded: the board is up as it is, with no flip.
  const [bookedAtLoad] = useState(showEvent);
  // The train waits above the first signal. A plan already lit at load has no train, so no room
  // for one; decided once, so the track never shifts under a train that is running.
  const [trainRoom] = useState(!cascade.planLit);
  const agent = hasAgentActivity(state.agentLog, shownAsks(state.asks, resolved));
  const [trackRef, trackWidth] = useElementWidth<HTMLDivElement>(PORTRAIT_DEFAULT_W);
  const suggesting = !state.plan && state.suggestion?.status === "open";
  // A suggestion already up at load shows settled, with no reveal.
  const [firstSuggestion] = useState(state.suggestion?.id ?? null);
  const booked = state.plan?.status === "booked";
  return (
    <PhoneScale>
      <div data-testid="phone-layout" className="stage-phone">
        <PhoneHeader plan={plan} />
        <main className="stage-phone-col">
          {showEvent && state.event && <PhoneEventBoard event={state.event} settled={bookedAtLoad} />}
          <section data-testid="phone-track" className="stage-phone-section">
            <div ref={trackRef}>
              {suggesting && state.suggestion ? (
                <SuggestionPanel suggestion={state.suggestion} people={state.people} settled={state.suggestion.id === firstSuggestion} />
              ) : (
                <TrackPanel state={state} cascade={cascade} orientation="portrait" width={trackWidth} trainRoom={trainRoom} />
              )}
            </div>
          </section>
          {/* Always mounted, so lines that arrive after load type in; display none takes no space without activity. */}
          <section className="stage-phone-section" style={agent ? undefined : { display: "none" }}>
            <AgentPanel state={state} resolved={resolved} />
          </section>
          <section className="stage-phone-section" style={!resolved && state.explanation === "" && streaming === null ? { display: "none" } : undefined}>
            <WhyPanel text={state.explanation} streaming={streaming} resolved={resolved} />
          </section>
          {booked && state.event ? (
            <section className="stage-phone-section">
              <Departs event={state.event} />
            </section>
          ) : null}
          {state.poll && manifestRows(state.poll).length ? (
            <section className="stage-phone-section">
              <Manifest poll={state.poll} />
            </section>
          ) : null}
          {showEvent && state.milestones ? (
            <section className="stage-phone-section">
              <Recap milestones={state.milestones} settled={bookedAtLoad} />
            </section>
          ) : null}
          <PhoneJoin value={state.attendeeCount} target={state.attendeeTarget} />
          <PhoneChat messages={state.messages} people={state.people} commitments={state.commitments} label={state.chatSource?.label} />
        </main>
      </div>
    </PhoneScale>
  );
}
