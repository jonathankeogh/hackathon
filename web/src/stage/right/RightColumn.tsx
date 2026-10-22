import { JoinQR, QR_SIZE } from "../components/JoinQR";
import { Odometer } from "../components/Odometer";
import { WhyPanel } from "../components/WhyPanel";
import type { StateV2 } from "../data/v2types";
import { colors } from "../tokens";
import { AgentPanel } from "./AgentPanel";
import { hasAgentActivity, shownAsks } from "./agentLog";

interface Props {
  state: StateV2;
  /** Raw concatenated explain:chunk text while a stream is live, otherwise null. */
  streaming: string | null;
  /** The plan is viable or booked, so nothing is stuck. */
  resolved: boolean;
}

const divider = `1px solid ${colors.divider}`;

/**
 * Right column, every section on one left edge: the agent (only once it has something to
 * show, otherwise it takes no space), why it is stuck, then the join QR beside the attendee
 * odometer. Sized for 1080 with the agent panel at its fullest.
 */
export function RightColumn({ state, streaming, resolved }: Props) {
  const agent = hasAgentActivity(state.agentLog, shownAsks(state.asks, resolved));
  return (
    <div
      data-slot="right-column"
      style={{ height: "100%", padding: "28px 40px 28px", display: "flex", flexDirection: "column", gap: 20 }}
    >
      {/* Always mounted, so lines that arrive after load type in; display none takes no space without activity. */}
      <div style={agent ? { paddingBottom: 20, borderBottom: divider } : { display: "none" }}>
        <AgentPanel state={state} resolved={resolved} />
      </div>
      {/* Takes whatever room is left and nothing below depends on its height, so streaming text shifts nothing. */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <WhyPanel text={state.explanation} streaming={streaming} resolved={resolved} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
        <JoinQR size={QR_SIZE} />
        <Odometer value={state.attendeeCount} target={state.attendeeTarget} />
      </div>
    </div>
  );
}
