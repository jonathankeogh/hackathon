import { Marquee, StatusCell, useReducedMotion } from "../design";
import { TICKER_BOTTOM, TICKER_TOP } from "./content";
import { useTick } from "./hooks";
import { wavesBooked } from "./stripLogic";

function Row({ items, tick, offset }: { items: readonly string[]; tick: number; offset: number }) {
  return (
    <>
      {items.map((text, i) => {
        const booked = wavesBooked(i, tick + offset, items.length);
        return (
          <span className="lp-tick-item" key={text} data-status={booked ? "booked" : "blocked"}>
            <span className="lp-tick-text">{text}</span>
            <StatusCell status={booked ? "booked" : "blocked"} />
          </span>
        );
      })}
    </>
  );
}

/** Two bands of plans that died in group chats, running opposite ways, flipping to BOOKED in a wave. */
export function Ticker() {
  const reduced = useReducedMotion();
  const tick = useTick(1700, !reduced);
  return (
    <section className="lp-ticker" aria-label="Plans that die in group chats">
      <p className="lp-ticker-label lp-wrap">Plans that die in group chats</p>
      <Marquee seconds={70} label="Plans that died, top row">
        <Row items={TICKER_TOP} tick={tick} offset={0} />
      </Marquee>
      <Marquee seconds={84} reverse label="Plans that died, bottom row">
        <Row items={TICKER_BOTTOM} tick={tick} offset={3} />
      </Marquee>
    </section>
  );
}
