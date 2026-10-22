import { motion } from "framer-motion";
import { BATCH_STAGGER_S } from "./nodeMotion";
import { SETTLE_TRACK_MS, useSettleKey } from "../motion/useSettleKey";
import { SignalLampFx } from "../components/SignalLampFx";
import type { LampStatus } from "./lampState";
import type { Metrics, TrackNode } from "./layout";
import { nodeMotion } from "./nodeMotion";
import { SignalLamp } from "./SignalLamp";

interface Props {
  node: TrackNode;
  m: Metrics;
  status: LampStatus;
  flash: boolean;
  /** PLAN lamp only: true for a moment after the plan lights, scales it 1 to 1.08 to 1. */
  pulse: boolean;
  /** Batch index while this node is arriving; undefined for a node that is already there. */
  enter: number | undefined;
}

/**
 * One lamp, drawn at the origin of its own group and moved into place with a transform, so
 * a layout change glides the lamp instead of jumping it.
 */
export function TrackNodeLamp({ node, m, status, flash, pulse, enter }: Props) {
  // Settle-net: after the entrance or glide should have ended, remount at the end state.
  const { key: settleKey } = useSettleKey(SETTLE_TRACK_MS + (enter ?? 0) * BATCH_STAGGER_S * 1000, `${node.x}:${node.y}:${enter ?? ""}`);
  return (
    <motion.g key={settleKey} data-testid="track-node" data-node-id={node.id} {...nodeMotion(node.x, node.y, enter)}>
      {node.kind === "plan" ? (
        <SignalLampFx flash={pulse} cx={m.housingR} cy={m.housingR} r={m.lampR} peak={1.08} clunkS={0.4} overlay={false}>
          <SignalLamp cx={m.housingR} cy={m.housingR} r={m.lampR} housingR={m.housingR} status={status} />
        </SignalLampFx>
      ) : (
        <SignalLampFx flash={flash} cx={m.housingR} cy={m.housingR} r={m.lampR}>
          <SignalLamp cx={m.housingR} cy={m.housingR} r={m.lampR} housingR={m.housingR} status={status} />
        </SignalLampFx>
      )}
    </motion.g>
  );
}
