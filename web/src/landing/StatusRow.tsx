import { SplitFlap } from "../design";
import { Odometer } from "./LandingOdometer";
import type { Story } from "./storyMap";

/** NO PLAN until Sam says "we should", then BLOCKED, then BOOKED. */
export function statusWord(story: Story): string {
  if (story.booked) return "BOOKED";
  return story.nodes.plan.appear > 0 ? "BLOCKED" : "NO PLAN";
}

/** The plan status as a split-flap board (BLOCKED, then BOOKED) and the audience counter. */
export function StatusRow({ story, size }: { story: Story; size: number }) {
  const appear = story.nodes.attendees.appear;
  return (
    <div className="lp-status">
      <div className="lp-status-board">
        <span className="lp-status-label">Plan</span>
        <SplitFlap text={statusWord(story)} size={size} fill={story.booked ? "var(--ds-green)" : story.nodes.plan.appear > 0 ? "var(--ds-red)" : undefined} flips={5} />
      </div>
      <div className="lp-counter" style={{ opacity: appear }} aria-label={`${story.attendees} of ${story.venueMin} attendees`}>
        <span className="lp-status-label">Audience</span>
        <span className="lp-counter-value">
          <Odometer value={story.attendees} digits={2} />
          <span className="lp-counter-of">{`/ ${story.venueMin}`}</span>
        </span>
      </div>
    </div>
  );
}
