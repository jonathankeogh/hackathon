import { motion } from "framer-motion";
import { colors, withAlpha } from "../tokens";
import type { TrackConnector as Connector } from "./layout";
import { SETTLE_TRACK_MS, useSettleKey } from "../motion/useSettleKey";
import { EXIT_S, MOVE_S } from "./nodeMotion";

const SWITCH = { duration: 0.15, ease: "linear" } as const;
const DRAW_S = 0.45;
const RAIL_IDLE = withAlpha("text", 0.3);

interface Props {
  connector: Connector;
  /** True once the node at the source end is lit green. */
  powered: boolean;
  /** Seconds before a new connector starts drawing; undefined for one that is already there. */
  drawDelay: number | undefined;
}

/**
 * A length of track, chamfered at 45 degrees, green once the source is unlocked. A new one
 * draws in along its length (stroke-dashoffset), a moved one eases to its new route, a removed
 * one fades out.
 */
export function TrackConnector({ connector, powered, drawDelay }: Props) {
  const rail = powered ? colors.green : RAIL_IDLE;
  // Settle-net: after the draw, glide or colour change should have ended, remount at the end state.
  const { key: settleKey } = useSettleKey(SETTLE_TRACK_MS + (drawDelay ?? 0) * 1000, `${connector.path}:${powered}:${drawDelay ?? ""}`);
  return (
    <motion.g key={settleKey} data-testid="track-connector" data-powered={powered} exit={{ opacity: 0, transition: { duration: EXIT_S, ease: "linear" } }}>
      <motion.path
        fill="none"
        strokeWidth={3}
        initial={drawDelay === undefined ? false : { d: connector.path, pathLength: 0, stroke: rail }}
        animate={{ d: connector.path, pathLength: 1, stroke: rail }}
        transition={{ stroke: SWITCH, d: { duration: MOVE_S, ease: "easeOut" }, pathLength: { duration: DRAW_S, ease: "linear", delay: drawDelay ?? 0 } }}
      />
    </motion.g>
  );
}
