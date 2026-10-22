import { bigStyle, Text } from "../design";
import { CtaGroup } from "./CtaGroup";
import { DeparturesStrip } from "./DeparturesStrip";
import { SignalHead } from "./SignalHead";
import { SignalLamp } from "../design";

export interface HeroProps {
  ready: boolean;
  live: boolean;
  liveIn?: string | null;
  onSignUp: () => void;
}

/** One headline line inside a mask, so it can rise into place without moving the layout. */
function Line({ children, soft = false, step }: { children: string; soft?: boolean; step: number }) {
  return (
    <span className="lp-line">
      <span className="lp-line-in" data-soft={soft || undefined} style={{ transitionDelay: `${step * 0.12}s` }}>
        {children}
      </span>
    </span>
  );
}

/** The opening screen: the headline at full size, the pitch, the action, a live departures board. */
export function Hero({ ready, live, liveIn, onSignUp }: HeroProps) {
  return (
    <section className="lp-hero" id="top" data-ready={ready}>
      <div className="lp-wrap lp-hero-grid">
        <div className="lp-hero-main">
          <p className="lp-eyebrow">
            {live ? <SignalLamp state="green" size="sm" /> : <SignalLamp state="red" size="sm" />}
            <span>{live ? (liveIn ? `Live in ${liveIn}` : "Live on WhatsApp") : "A signal box for group chats"}</span>
          </p>
          <h1 className="lp-h1" style={bigStyle("hero")}>
            <Line soft step={0}>
              {"Every group chat has a “we should” that dies."}
            </Line>
            <Line step={2}>Deadlock makes it happen.</Line>
          </h1>
          <div className="lp-hero-foot lp-fade" data-step="3">
            <div className="lp-actions">
              <CtaGroup live={live} onSignUp={onSignUp} />
            </div>
            <Text className="lp-lede">
              Someone says they will, if. Everyone waits on someone else. Deadlock reads the chat, finds the one condition holding the rest, asks the person who can move it, and books the plan.
            </Text>
          </div>
        </div>
        <div className="lp-hero-aside lp-fade" data-step="2">
          <SignalHead />
        </div>
      </div>
      <div className="lp-wrap lp-fade" data-step="4">
        <DeparturesStrip />
      </div>
    </section>
  );
}
