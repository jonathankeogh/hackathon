import { SplitFlap, Text } from "../design";
import { agentLine, T, type Story } from "./storyMap";

function tone(story: Story): string | undefined {
  const { p } = story;
  if (p >= T.booked) return "var(--ds-green)";
  if (p >= T.green.attendees) return "var(--ds-amber)";
  if (p >= T.ask[0]) return "var(--ds-amber)";
  if (p >= T.stuck[0]) return "var(--ds-red)";
  return undefined;
}

/** What the agent is doing right now, and, once booked, the event on a small departures board. */
export function AgentStrip({ story, size }: { story: Story; size: number }) {
  const line = agentLine(story);
  return (
    <div className="lp-agent">
      <p className="lp-status-label">Agent</p>
      <div className="lp-agent-body">
        <div className="lp-agent-now">
          <SplitFlap text={line.label} size={size} fill={tone(story)} flips={4} stagger={14} />
          <Text className="lp-agent-text" muted>
            {line.text}
          </Text>
        </div>
        <div className="lp-agent-event" data-on={story.p >= T.loosen}>
          <div className="lp-event-row">
            <span className="lp-status-label">When</span>
            <SplitFlap text={story.booked ? "THU 19:00" : ""} length={9} size={size - 4} flips={4} stagger={20} />
          </div>
          <div className="lp-event-row">
            <span className="lp-status-label">Where</span>
            <SplitFlap text={story.booked ? "PRIYA OFFICE" : ""} length={12} size={size - 4} flips={4} stagger={20} />
          </div>
        </div>
      </div>
    </div>
  );
}
