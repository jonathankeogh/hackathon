import { useRef } from "react";
import { bigStyle, Text, useInView, useReducedMotion } from "../design";
import { CtaGroup } from "./CtaGroup";
import { FooterWordmark } from "./FooterWordmark";
import { useElementScroll } from "./hooks";
import { SectionMark } from "./SectionMark";

export interface ClosingProps {
  live: boolean;
  onSignUp: () => void;
}

/** The big ask, then the wordmark across the full width and a one line footer. */
export function Closing({ live, onSignUp }: ClosingProps) {
  const reduced = useReducedMotion();
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const foot = useRef<HTMLElement | null>(null);
  const offset = useElementScroll(foot, !reduced);
  return (
    <section className="lp-close" aria-labelledby="close-h">
      <SectionMark n="04" label="Start" id="start" />
      <div className="lp-wrap lp-close-grid" ref={ref} data-in={seen}>
        <h2 id="close-h" className="lp-mega" style={bigStyle("mega")}>
          <span className="lp-line">
            <span className="lp-line-in" data-shown={seen}>
              Start an event
            </span>
          </span>
        </h2>
        <div className="lp-close-foot">
          <div className="lp-actions">
            <CtaGroup live={live} onSignUp={onSignUp} />
          </div>
          <Text className="lp-lede">Link a WhatsApp group, tag the bot, and watch the first stuck plan clear. It takes a minute and needs no account.</Text>
        </div>
      </div>
      <footer className="lp-footer" ref={foot}>
        <div className="lp-wrap">
          <FooterWordmark offset={offset} />
          <div className="lp-footer-line">
            <span>Built at the Grok hackathon, London, 2026</span>
            <span className="lp-footer-links">
              <a className="ds-focusable" href="/stage">
                Stage
              </a>
              <a className="ds-focusable" href="/join">
                Join
              </a>
              <a className="ds-focusable" href="/design">
                Design system
              </a>
            </span>
          </div>
        </div>
      </footer>
    </section>
  );
}
