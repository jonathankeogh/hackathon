import { SignalLamp, SplitFlap } from "../design";
import { CtaGroup } from "./CtaGroup";

export interface NavProps {
  live: boolean;
  liveIn?: string | null;
  /** 0..1 of the page scrolled, drawn as a green rail on the bottom edge. */
  progress: number;
  onSignUp: () => void;
}

const LINKS = [
  { href: "#signal-box", label: "The line" },
  { href: "#how", label: "How it works" },
  { href: "#proof", label: "Proof" },
] as const;

/** The top bar: wordmark, section links, the primary action, and the page progress rail. */
export function Nav({ live, liveIn, progress, onSignUp }: NavProps) {
  return (
    <nav className="lp-nav" aria-label="Page">
      <a className="lp-nav-mark ds-focusable" href="#top" aria-label="Deadlock, back to top" data-cursor="press">
        <SplitFlap text="DEADLOCK" size={18} />
      </a>
      <ul className="lp-nav-links">
        {LINKS.map((l) => (
          <li key={l.href}>
            <a className="lp-nav-link ds-focusable" href={l.href}>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="lp-nav-right">
        {live ? (
          <span className="lp-nav-live">
            <SignalLamp state="green" size="sm" />
            <span>{liveIn ? `Live in ${liveIn}` : "Live"}</span>
          </span>
        ) : null}
        <CtaGroup live={live} onSignUp={onSignUp} size="sm" compact />
      </div>
      <span className="lp-nav-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden />
    </nav>
  );
}
