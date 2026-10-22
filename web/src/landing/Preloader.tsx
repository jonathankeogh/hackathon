import { useCallback, useEffect, useRef, useState } from "react";
import { SignalLamp, SplitFlap } from "../design";
import { lampStep, markPreloaderSeen, PRELOADER } from "./preloaderLogic";

const LIFT_MS = 360;

export interface PreloaderProps {
  /** Called once, when the board has lifted away and the page can play its own entrance. */
  onDone: () => void;
}

/**
 * The opening: the DEADLOCK board flips in while a row of signals goes red, amber, green, then
 * the board lifts away (translate only) and the hero is revealed. Under 1.5s, any press or key
 * skips it. Every stage runs off one timeline of timers; the last timer is the settle-net that
 * always finishes, even if the tab was throttled.
 */
export function Preloader({ onDone }: PreloaderProps) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [lifting, setLifting] = useState(false);
  const done = useRef(false);
  const timers = useRef<number[]>([]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    markPreloaderSeen();
    onDone();
  }, [onDone]);

  const lift = useCallback(() => {
    setLifting(true);
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [window.setTimeout(finish, LIFT_MS + 40)];
  }, [finish]);

  useEffect(() => {
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    at(PRELOADER.flipStart, () => setText("DEADLOCK"));
    at(PRELOADER.red, () => setStep(lampStep(PRELOADER.red)));
    at(PRELOADER.amber, () => setStep(lampStep(PRELOADER.amber)));
    at(PRELOADER.green, () => setStep(lampStep(PRELOADER.green)));
    at(PRELOADER.lift, () => setLifting(true));
    at(PRELOADER.done, finish);
    const skip = () => lift();
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      html.style.overflow = before;
    };
  }, [finish, lift]);

  return (
    <div className="lp-pre" data-lifting={lifting} aria-hidden data-testid="preloader">
      <div className="lp-pre-body">
        <SplitFlap text={text} length={8} size={56} stagger={32} flips={5} />
        <div className="lp-pre-lamps">
          <SignalLamp size="lg" state={step >= 1 ? "red" : "off"} />
          <SignalLamp size="lg" state={step >= 2 ? "amber" : "off"} />
          <SignalLamp size="lg" state={step >= 3 ? "green" : "off"} />
        </div>
      </div>
      <p className="lp-pre-skip">Press any key to skip</p>
    </div>
  );
}
