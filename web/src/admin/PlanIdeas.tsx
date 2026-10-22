import { Button, Label, Text } from "../design";
import type { Suggestion } from "@deadlock/shared/types";
import type { Act } from "./useAdminActions";

export type PickId = "live" | "venue" | "area";
const PICKS: readonly PickId[] = ["live", "venue", "area"];

/** Three big buttons that make one of the offered plans the plan. Option titles show when a suggestion is live. */
export function PickButtons({ act, suggestion }: { act: Act; suggestion?: Suggestion | null }) {
  return (
    <div className="ad-picks">
      {PICKS.map((option, i) => {
        const offered = suggestion?.options.find((o) => o.id === option);
        return (
          <Button
            key={option}
            block
            variant="secondary"
            className="ad-row-btn"
            loading={act.isPending(`pick-${option}`)}
            disabled={act.offline}
            onClick={() => act.run(`pick-${option}`, "admin:pick", { option }, `pick ${i + 1}`)}
          >
            <span className="ad-row">
              <span className="ad-row-title">{`Pick ${i + 1}`}</span>
              {offered ? <span className="ad-row-hint">{`${offered.title}, ${offered.votes.length} vote${offered.votes.length === 1 ? "" : "s"}`}</span> : null}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

/** The plan ideas the bot offered, shown at the top of the run sheet while one exists. */
export function PlanIdeas({ suggestion, act }: { suggestion: Suggestion; act: Act }) {
  return (
    <div className="ad-ideas" data-testid="plan-ideas">
      <Label strong>Plan ideas</Label>
      <Text>{`${suggestion.topic}, ${suggestion.status}. ${suggestion.people.length} people on it.`}</Text>
      <PickButtons act={act} suggestion={suggestion} />
    </div>
  );
}
