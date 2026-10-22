import { useRef } from "react";
import { useReducedMotion } from "../design";
import { AgentStrip } from "./AgentStrip";
import { BeatRail } from "./BeatRail";
import { ChatColumn } from "./ChatColumn";
import { useMatch, useScrollProgress } from "./hooks";
import { SectionMark } from "./SectionMark";
import { StatusRow } from "./StatusRow";
import { storyAt } from "./storyMap";
import { TrackBoard } from "./TrackBoard";

/** Height of the sticky nav, which the pinned panel sits under. */
export const NAV_H = { wide: 64, phone: 56 } as const;

/**
 * The signature scene. A tall section with a sticky panel inside: scrolling through the section
 * drives storyAt(p), which draws the chat, the signals, the counter, the agent's question and
 * the cascade. Under reduced motion there is no pin: the finished picture sits in the page.
 */
export function SignalBoxScene() {
  const reduced = useReducedMotion();
  const wide = useMatch("(min-width: 768px)");
  const outer = useRef<HTMLElement | null>(null);
  const p = useScrollProgress(outer, wide ? NAV_H.wide : NAV_H.phone, !reduced, 1);
  const story = storyAt(p);
  const flap = wide ? 34 : 22;
  return (
    <>
      <SectionMark n="01" label="The line" id="signal-box" />
      <section ref={outer} className="lp-scene" data-static={reduced || undefined} aria-label="How a stuck plan clears, driven by scroll">
        <div className="lp-pin">
          <div className="lp-wrap lp-pin-inner">
            <header className="lp-pin-top">
              <BeatRail index={story.beatIndex} />
              <span className="lp-pin-hint" aria-hidden>
                {reduced ? "The finished picture" : "Keep scrolling"}
              </span>
            </header>
            <div className="lp-pin-grid">
              <ChatColumn story={story} />
              <div className="lp-pin-right">
                <StatusRow story={story} size={flap} />
                <TrackBoard story={story} />
                <AgentStrip story={story} size={wide ? 26 : 18} />
              </div>
            </div>
            <div className="lp-pin-progress" aria-hidden>
              <span style={{ transform: `scaleX(${story.p})` }} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
