import { SignalLamp } from "../design";
import { BEATS } from "./storyMap";

/** The six beats of the story. Past beats are green, the current one amber, the rest unlit. */
export function BeatRail({ index }: { index: number }) {
  return (
    <ol className="lp-beats" aria-label="Story progress">
      {BEATS.map((b, i) => (
        <li key={b.id} className="lp-beat" data-state={i < index ? "past" : i === index ? "now" : "next"} aria-current={i === index ? "step" : undefined}>
          <SignalLamp size="sm" state={i < index ? "green" : i === index ? "amber" : "off"} />
          <span className="lp-beat-text">
            <span className="lp-beat-n">{String(i + 1).padStart(2, "0")}</span> {b.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
