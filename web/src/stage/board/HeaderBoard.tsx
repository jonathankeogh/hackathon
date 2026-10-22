import type { Plan } from "@deadlock/shared/types";
import { SplitFlap } from "../components/SplitFlap";
import { statusView } from "../components/DepartureBoard";
import { plainCopy } from "../text/plainCopy";
import { type } from "../tokens";
import { fitTitle } from "./fitTitle";

const FLAP_SIZE = type.display;
/** Reserved so the strip keeps its height while a row has no cells yet. */
const ROW_H = Math.round(FLAP_SIZE * 1.2);

/**
 * The top strip: plan title on the left, status on the right, both as split-flap rows. A row
 * is only as wide as its text; the cells still flip when the text changes.
 */
export function HeaderBoard({ plan }: { plan: Plan | null }) {
  const status = statusView(plan);
  return (
    <div
      data-testid="header-board"
      style={{ height: "100%", padding: "0 64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
    >
      <div style={{ minHeight: ROW_H }}>
        <SplitFlap text={plan ? fitTitle(plainCopy(plan.title)) : ""} size={FLAP_SIZE} />
      </div>
      <div style={{ minHeight: ROW_H }}>
        <SplitFlap text={status.text} size={FLAP_SIZE} fill={status.fill} />
      </div>
    </div>
  );
}
