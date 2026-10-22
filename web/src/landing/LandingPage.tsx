import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../design";
import { Closing } from "./Closing";
import { Cursor } from "./Cursor";
import { Hero } from "./Hero";
import { HowIt } from "./HowIt";
import { Nav } from "./Nav";
import { Preloader } from "./Preloader";
import { shouldShowPreloader } from "./preloaderLogic";
import { Proof } from "./Proof";
import { SignalBoxScene } from "./SignalBoxScene";
import { Ticker } from "./Ticker";
import "./landing.css";
import "./scene.css";
import "./sections.css";

export interface LandingPageProps {
  /** The name of the chat a plan is running in, if any. */
  liveIn?: string | null;
  /** A WhatsApp is linked or a plan is running: offer the stage first. */
  live: boolean;
  onSignUp: () => void;
}

function usePageProgress(enabled: boolean): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.round(Math.min(1, Math.max(0, window.scrollY / max)) * 500) / 500 : 0);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled]);
  return p;
}

/**
 * The landing page: preloader, hero, ticker, the pinned signal box story, how it works, proof,
 * and the closing ask with the full width wordmark. Its two actions hand off to the existing
 * sign-up step through onSignUp.
 */
export function LandingPage({ live, liveIn, onSignUp }: LandingPageProps) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement | null>(null);
  const [intro, setIntro] = useState(() => shouldShowPreloader(reduced));
  const progress = usePageProgress(!reduced);
  return (
    <div className="ds-root lp" ref={root}>
      {intro ? <Preloader onDone={() => setIntro(false)} /> : null}
      <Cursor rootRef={root} />
      <Nav live={live} liveIn={liveIn} progress={progress} onSignUp={onSignUp} />
      <main>
        <Hero ready={!intro} live={live} liveIn={liveIn} onSignUp={onSignUp} />
        <Ticker />
        <SignalBoxScene />
        <HowIt />
        <Proof />
        <Closing live={live} onSignUp={onSignUp} />
      </main>
    </div>
  );
}
