import { SplitFlap, StatusCell } from "../design";
import { useReducedMotion } from "../design";
import { useMatch, useTick } from "./hooks";
import { stripRow } from "./stripLogic";

/** Three rows on desktop and two on a phone: a live departures board of plans waiting on someone. */
export function DeparturesStrip() {
  const reduced = useReducedMotion();
  const wide = useMatch("(min-width: 768px)");
  const tick = useTick(3400, !reduced);
  const rows = wide ? [0, 1, 2] : [0, 1];
  const size = wide ? 26 : 18;
  return (
    <div className="lp-strip" role="group" aria-label="Departures: plans waiting on someone">
      <div className="lp-strip-head">
        <span>Plan</span>
        <span className="lp-strip-col-wait">Waiting on</span>
        <span>Status</span>
      </div>
      {rows.map((row) => {
        const r = stripRow(tick, row);
        return (
          <div className="lp-strip-row" key={row}>
            <SplitFlap text={r.plan.name} length={12} size={size} />
            <span className="lp-strip-col-wait">
              <SplitFlap text={r.waitingOn} length={10} size={size} />
            </span>
            <StatusCell status={r.status} />
          </div>
        );
      })}
    </div>
  );
}
