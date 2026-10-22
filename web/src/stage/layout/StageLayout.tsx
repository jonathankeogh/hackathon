import type { StateV2 } from "../data/v2types";
import type { CascadeSnapshot } from "../cascade/sequencer";
import { colors } from "../tokens";
import { HeaderBoard } from "../board/HeaderBoard";
import { LeftColumn } from "./LeftColumn";
import { RightColumn } from "../right/RightColumn";
import { displayedPlan } from "../track/lampState";
import { TrackPanel } from "../track/TrackPanel";

export const STRIP_H = 160;
const HAIRLINE = `1px solid ${colors.divider}`;

/**
 * Top strip (departures board) over three columns: chat 30%, track 45%, right 25%.
 * At 1920 wide that is 576 / 864 / 480 px.
 */
interface Props {
  state: StateV2;
  cascade: CascadeSnapshot;
  streaming: string | null;
}

export function StageLayout({ state, cascade, streaming }: Props) {
  // Viable and booked only show once the cascade has lit the PLAN lamp, so the header flip,
  // the "why" text and the event board land with the chime.
  const plan = displayedPlan(state.plan, cascade.planLit);
  const resolved = plan?.status === "viable" || plan?.status === "booked";
  const showEvent = plan?.status === "booked" && state.event !== null;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <header style={{ height: STRIP_H, borderBottom: HAIRLINE, flex: "none" }}>
        <HeaderBoard plan={plan} />
      </header>
      <main style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "30% 45% 25%" }}>
        <section style={{ borderRight: HAIRLINE, minWidth: 0, minHeight: 0 }}>
          <LeftColumn state={state} showEvent={showEvent} />
        </section>
        <section style={{ borderRight: HAIRLINE, minWidth: 0, minHeight: 0 }}>
          <TrackPanel state={state} cascade={cascade} />
        </section>
        <section style={{ minWidth: 0, minHeight: 0 }}>
          <RightColumn state={state} streaming={streaming} resolved={resolved} />
        </section>
      </main>
    </div>
  );
}
