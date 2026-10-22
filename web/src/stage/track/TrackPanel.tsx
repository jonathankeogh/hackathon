import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useFlashOnChange } from "../motion/useFlashOnChange";
import type { StateV2 } from "../data/v2types";
import type { CascadeSnapshot } from "../cascade/sequencer";
import { changedCondition } from "./conditionDiff";
import { useRequiresHistory } from "./useRequiresHistory";
import { audienceThreshold, nodeLamp } from "./lampState";
import { computeTrackLayout, PLAN_ID, type TrackNode } from "./layout";
import { TrackNodeLamp } from "./TrackNodeLamp";
import { useEntrances } from "./useEntrances";
import { TrackConnector } from "./TrackConnector";
import { TrackLabel } from "./TrackLabel";

const CONNECTOR_DELAY_S = 0.2;
const CONNECTOR_STAGGER_S = 0.06;

/** The centre column: signals on a railway, one per commitment, ending at the PLAN signal. */
export function TrackPanel({ state, cascade }: { state: StateV2; cascade: CascadeSnapshot }) {
  const history = useRequiresHistory(state.commitments);
  const layout = useMemo(() => computeTrackLayout(state), [state]);
  const peopleById = useMemo(() => new Map(state.people.map((p) => [p.id, p])), [state.people]);
  const commitmentById = useMemo(() => new Map(state.commitments.map((c) => [c.id, c])), [state.commitments]);
  const nodeEnter = useEntrances(layout.nodes.map((n) => n.id));
  const connectorEnter = useEntrances(layout.connectors.map((c) => c.id));

  const statusOf = (n: TrackNode) => nodeLamp(n.kind, n.commitmentId ? commitmentById.get(n.commitmentId) : undefined, state, cascade);
  // One-shot when the plan lights: its connectors go green and the PLAN lamp scales 1 to 1.08 to 1.
  const planPulse = useFlashOnChange(cascade.planLit, 450) && cascade.planLit;
  const flashing = (n: TrackNode) => n.commitmentId !== undefined && cascade.flashing.has(n.commitmentId);
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));

  return (
    <div data-testid="track-panel" style={{ position: "relative", width: layout.width, height: layout.height }}>
      <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0 }}>
        <AnimatePresence initial={false}>
          {layout.connectors.map((c) => {
            const index = connectorEnter.get(c.id);
            return (
              <TrackConnector
                key={c.id}
                connector={c}
                powered={statusOf(nodeById.get(c.fromId)!) === "green" && (c.toId !== PLAN_ID || cascade.planLit)}
                drawDelay={index === undefined ? undefined : CONNECTOR_DELAY_S + index * CONNECTOR_STAGGER_S}
              />
            );
          })}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {layout.nodes.map((n) => (
            <TrackNodeLamp key={n.id} node={n} m={layout.metrics} status={statusOf(n)} flash={flashing(n)} pulse={planPulse && n.id === PLAN_ID} enter={nodeEnter.get(n.id)} />
          ))}
        </AnimatePresence>
      </svg>
      <AnimatePresence initial={false}>
        {layout.nodes.map((n) => {
          const c = n.commitmentId ? commitmentById.get(n.commitmentId) : undefined;
          return (
            <TrackLabel
              key={n.id}
              node={n}
              m={layout.metrics}
              enter={nodeEnter.get(n.id)}
              person={c ? peopleById.get(c.personId) : undefined}
              offers={c?.offers}
              quote={c?.quote}
              change={c ? changedCondition(history, state.asks, c.id) : null}
              count={`${state.attendeeCount} / ${audienceThreshold(state)}`}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
