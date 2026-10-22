import { useEffect, useState } from "react";
import { Reveal, useInView } from "../design";
import { Odometer } from "./LandingOdometer";
import { PROOF, RULES } from "./content";
import { SectionMark } from "./SectionMark";

function Counter({ value, digits, delayMs }: { value: number; digits: number; delayMs: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.4);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!seen) return;
    const id = window.setTimeout(() => setShown(value), delayMs);
    return () => window.clearTimeout(id);
  }, [seen, value, delayMs]);
  return (
    <span ref={ref} className="lp-proof-value">
      <Odometer value={seen && delayMs === 0 ? value : shown} digits={digits} />
    </span>
  );
}

/** Three odometer counters, labelled as demo numbers, and the three rules of the box. */
export function Proof() {
  return (
    <section className="lp-proof" aria-labelledby="proof-h">
      <SectionMark n="03" label="Proof" id="proof" />
      <div className="lp-wrap">
        <Reveal>
          <h2 id="proof-h" className="lp-section-h">
            What a cleared line looks like.
          </h2>
        </Reveal>
        <p className="lp-proof-note">Demo numbers from rehearsal runs. Not live metrics.</p>
        <ul className="lp-proof-grid">
          {PROOF.map((p, i) => (
            <li key={p.label} className="lp-proof-cell">
              <span className="lp-proof-label">{p.label}</span>
              <Counter value={p.value} digits={p.digits} delayMs={i * 220} />
              <span className="lp-proof-sub">{p.note}</span>
            </li>
          ))}
        </ul>
        <ul className="lp-rules">
          {RULES.map((r, i) => (
            <Reveal as="li" key={r.head} className="lp-rule" delay={i * 0.08}>
              <h3 className="lp-rule-head">{r.head}</h3>
              <p className="lp-rule-body">{r.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
