import type { Plan } from "@deadlock/shared/types";
import { SplitFlap } from "../components/SplitFlap";
import { statusView } from "../components/DepartureBoard";
import { plainCopy } from "../text/plainCopy";
import { colors, fonts, phoneSize } from "../tokens";

const FLAP_SIZE = 18;

/**
 * The slim sticky header: the plan title in plain Plex Mono (a flap row that long would not
 * fit a phone) and the status as a signal-filled split-flap cell row. Stays on screen while
 * the page scrolls, so the verdict is always in view.
 */
export function PhoneHeader({ plan }: { plan: Plan | null }) {
  const status = statusView(plan);
  return (
    <header data-testid="phone-header" className="stage-phone-header">
      <div className="stage-phone-col stage-phone-header-row">
        {plan && (
          <h1
            style={{
              margin: 0,
              flex: 1,
              minWidth: 0,
              fontFamily: fonts.mono,
              fontSize: phoneSize.label,
              fontWeight: 600,
              lineHeight: 1.25,
              textTransform: "uppercase",
              color: colors.text,
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {plainCopy(plan.title)}
          </h1>
        )}
        <div style={{ flex: "none", minHeight: Math.round(FLAP_SIZE * 1.2) }}>
          <SplitFlap text={status.text} size={FLAP_SIZE} fill={status.fill} />
        </div>
      </div>
    </header>
  );
}
