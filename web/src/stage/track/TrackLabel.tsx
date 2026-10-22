import { motion } from "framer-motion";
import type { Person } from "@deadlock/shared/types";
import { PersonName } from "../components/PersonName";
import { plainCopy } from "../text/plainCopy";
import { alphas, fonts, withAlpha } from "../tokens";
import { ChangedConditionLine } from "./ChangedConditionLine";
import type { ChangedCondition } from "./conditionDiff";
import type { Metrics, TrackNode } from "./layout";
import { BATCH_STAGGER_S, nodeMotion } from "./nodeMotion";
import { SETTLE_TRACK_MS, useSettleKey } from "../motion/useSettleKey";

const caps = { fontFamily: fonts.mono, textTransform: "uppercase" } as const;
const clip = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;

interface Props {
  node: TrackNode;
  m: Metrics;
  /** Batch index while this label is arriving; undefined for one that is already there. */
  enter: number | undefined;
  person?: Person;
  offers?: string;
  quote?: string;
  /** An accepted ask relaxed this signal's condition: old struck through, new beside it. */
  change?: ChangedCondition | null;
  /** Audience node only: "3 / 15". */
  count?: string;
}

/** The text hanging under a lamp: name, what they offer, and their exact quote. */
export function TrackLabel({ node, m, enter, person, offers, quote, change, count }: Props) {
  const { key: settleKey, settled } = useSettleKey(SETTLE_TRACK_MS + (enter ?? 0) * BATCH_STAGGER_S * 1000, `${node.labelX}:${node.labelY}:${enter ?? ""}:${change?.to ?? ""}`);
  return (
    <motion.div
      key={settleKey}
      data-testid={`track-label-${node.id}`}
      {...nodeMotion(node.labelX, node.labelY, enter)}
      style={{ position: "absolute", left: 0, top: 0, width: node.labelW, transformOrigin: "50% 0%" }}
    >
      {node.kind === "commitment" && (
        <>
          <div style={{ ...clip, height: m.nameLine, lineHeight: `${m.nameLine}px` }}>
            <PersonName person={person} size={m.nameSize} />
          </div>
          <div style={{ ...clip, fontFamily: fonts.sans, textTransform: "uppercase", fontSize: m.offerSize, fontWeight: 500, lineHeight: `${m.offerLine}px` }}>{offers}</div>
          {change && <ChangedConditionLine change={change} animate={!settled} />}
          <div
            style={{
              marginTop: m.quoteGap,
              fontFamily: fonts.mono,
              fontSize: m.quoteSize,
              lineHeight: `${m.quoteLine}px`,
              color: withAlpha("text", alphas.read),
              overflow: "hidden",
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: change ? Math.max(1, m.quoteLines - 1) : m.quoteLines,
              WebkitBoxOrient: "vertical",
            }}
          >
            {`"${plainCopy(quote ?? "")}"`}
          </div>
        </>
      )}
      {node.kind === "audience" && (
        <>
          <div style={{ ...caps, fontSize: m.nameSize, lineHeight: `${m.nameLine}px`, fontWeight: 600, color: withAlpha("text", alphas.read) }}>AUDIENCE</div>
          <div style={{ fontFamily: fonts.mono, fontSize: m.offerSize, whiteSpace: "nowrap", lineHeight: `${m.offerLine}px`, fontWeight: 600 }}>{count}</div>
        </>
      )}
      {node.kind === "plan" && (
        <div style={{ ...caps, fontSize: m.nameSize, fontWeight: 700, lineHeight: `${m.offerLine}px` }}>PLAN</div>
      )}
    </motion.div>
  );
}
