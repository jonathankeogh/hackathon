import { Reveal, SignalLamp, bigStyle } from "../design";
import { HOW, type Beat } from "./content";
import { SectionMark } from "./SectionMark";

/** Small drawings that sit in the row. Strokes use currentColor so they invert with the row on hover. */
function Sketch({ n }: { n: Beat["n"] }) {
  if (n === "01") {
    return (
      <svg viewBox="0 0 220 96" className="lp-sketch" aria-hidden>
        <rect x="1.5" y="1.5" width="217" height="93" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <text x="16" y="38" className="lp-sketch-mono">
          we should do it
        </text>
        <text x="16" y="72" className="lp-sketch-mono">
          @deadlock
        </text>
        <rect x="118" y="56" width="10" height="20" fill="currentColor" />
      </svg>
    );
  }
  if (n === "02") {
    return (
      <svg viewBox="0 0 220 96" className="lp-sketch" aria-hidden>
        <path d="M 24 48 L 110 48 L 130 24 L 196 24 M 110 48 L 130 72 L 196 72" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="24" cy="48" r="10" fill="var(--ds-amber)" />
        <circle cx="110" cy="48" r="10" fill="var(--ds-red)" />
        <circle cx="196" cy="24" r="10" fill="var(--ds-amber)" />
        <circle cx="196" cy="72" r="10" fill="var(--ds-amber)" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 220 96" className="lp-sketch" aria-hidden>
      <text x="16" y="34" className="lp-sketch-mono">
        would 12 work?
      </text>
      <text x="16" y="72" className="lp-sketch-mono">
        yeah 12 is fine
      </text>
      <circle cx="190" cy="62" r="9" fill="var(--ds-green)" />
      <circle cx="210" cy="62" r="9" fill="var(--ds-green)" />
    </svg>
  );
}

function Row({ beat, index }: { beat: Beat; index: number }) {
  return (
    <Reveal as="li" className="lp-how-row" delay={index * 0.06}>
      <article className="lp-how-article" tabIndex={0}>
        <span className="lp-how-fill" data-lamp={beat.lamp} aria-hidden />
        <span className="lp-how-n" style={bigStyle("hero")} aria-hidden>
          {beat.n}
        </span>
        <div className="lp-how-copy">
          <h3 className="lp-how-title">{beat.title}</h3>
          <p className="lp-how-body">{beat.body}</p>
        </div>
        <div className="lp-how-reveal">
          <div className="lp-how-sketchwrap">
            <Sketch n={beat.n} />
          </div>
          <p className="lp-how-detail">
            <SignalLamp size="sm" state={beat.lamp} />
            <span>{beat.detail}</span>
          </p>
        </div>
      </article>
    </Reveal>
  );
}

/** Three numbered beats. Each row fills with the text colour on hover or focus and shows its detail. */
export function HowIt() {
  return (
    <section className="lp-how" aria-labelledby="how-h">
      <SectionMark n="02" label="How it works" id="how" />
      <div className="lp-wrap">
        <Reveal>
          <h2 id="how-h" className="lp-section-h">
            Three steps, no meeting.
          </h2>
        </Reveal>
        <ol className="lp-how-list">
          {HOW.map((b, i) => (
            <Row key={b.n} beat={b} index={i} />
          ))}
        </ol>
      </div>
    </section>
  );
}
