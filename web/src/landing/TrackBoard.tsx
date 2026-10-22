import type { ReactNode } from "react";
import { SignalLamp, StatusCell } from "../design";
import { NODE_IDS, NODES, type NodeId } from "./content";
import { useElementSize } from "./hooks";
import type { Story } from "./storyMap";
import { trackLayout, type TrackLayout } from "./trackLayout";

function condition(id: NodeId, story: Story): ReactNode {
  if (id === "venue") {
    return story.loosened ? (
      <>
        needs <s>15</s> 12 people
      </>
    ) : (
      "needs 15 people"
    );
  }
  if (id === "attendees") return `${story.attendees} of ${story.venueMin} joined`;
  return NODES[id].need;
}

function Label({ id, story, layout }: { id: NodeId; story: Story; layout: TrackLayout }) {
  const info = NODES[id];
  const n = layout.nodes[id];
  const appear = story.nodes[id].appear;
  return (
    <div
      className="lp-node-label"
      data-compact={layout.compact || undefined}
      style={{ left: n.x - layout.labelW / 2, top: n.y + layout.lamp / 2 + 10, width: layout.labelW, opacity: appear, transform: `translateY(${Math.round((1 - appear) * 10)}px)` }}
    >
      <span className="lp-node-role">{info.role}</span>
      <span className="lp-node-person">{info.person}</span>
      <span className="lp-node-need">{condition(id, story)}</span>
      {!layout.compact && info.quote ? <span className="lp-node-quote">{`“${info.quote}”`}</span> : null}
    </div>
  );
}

/** How visible an unlit signal is before the story reaches it: the board is built and waiting. */
const GHOST = 0.35;

function Train({ story, layout }: { story: Story; layout: TrackLayout }) {
  const plan = layout.nodes.plan;
  const start = plan.x + layout.lamp / 2 + 10;
  const left = start + story.train * (layout.w - start + 10);
  return (
    <div className="lp-train" aria-hidden style={{ left, top: plan.y - 8, opacity: story.nodes.plan.lamp === "green" ? 1 : 0 }}>
      <span />
      <span />
      <span />
    </div>
  );
}

function CalloutTag({ story, layout }: { story: Story; layout: TrackLayout }) {
  if (!story.callout) return null;
  const venue = layout.nodes.venue;
  return (
    <div className="lp-callout" data-tone={story.callout.tone} style={{ left: venue.x, top: venue.y - layout.lamp / 2 - 4 }}>
      <StatusCell status={story.callout.tone} label={story.callout.label} />
      <span className="lp-callout-stem" />
    </div>
  );
}

/** The track diagram: five signals on a railway, drawn in SVG and HTML, lit by the story. */
export function TrackBoard({ story }: { story: Story }) {
  const [ref, size] = useElementSize<HTMLDivElement>({ w: 900, h: 460 });
  const layout = trackLayout(size.w, size.h);
  const lampSize = layout.lamp >= 40 ? "lg" : "md";
  return (
    <div className="lp-track" ref={ref} role="img" aria-label="Track diagram: attendees to venue, then speaker and laptops, then the plan">
      <svg className="lp-track-svg" width={layout.w} height={layout.h} viewBox={`0 0 ${layout.w} ${layout.h}`} aria-hidden>
        {layout.connectors.map((c) => {
          const s = story.connectors.find((x) => x.id === c.id)!;
          return (
            <g key={c.id}>
              <path d={c.d} className="lp-rail" style={{ opacity: GHOST + (1 - GHOST) * s.appear }} />
              <path d={c.d} className="lp-rail lp-rail-live" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - s.power} />
            </g>
          );
        })}
        <path d={layout.exit} className="lp-rail" style={{ opacity: GHOST + (1 - GHOST) * story.nodes.plan.appear }} />
        <path d={layout.exit} className="lp-rail lp-rail-live" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - story.exit} />
      </svg>
      <Train story={story} layout={layout} />
      <CalloutTag story={story} layout={layout} />
      {NODE_IDS.map((id) => {
        const n = layout.nodes[id];
        const s = story.nodes[id];
        return (
          <div key={id} className="lp-node" style={{ left: n.x - layout.lamp / 2, top: n.y - layout.lamp / 2, opacity: GHOST + (1 - GHOST) * s.appear, transform: `scale(${0.8 + 0.2 * s.appear})` }}>
            <SignalLamp size={lampSize} state={s.appear > 0 ? s.lamp : "off"} flash />
          </div>
        );
      })}
      {NODE_IDS.map((id) => (
        <Label key={id} id={id} story={story} layout={layout} />
      ))}
    </div>
  );
}
