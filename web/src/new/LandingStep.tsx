import { Button, Heading, Label, SignalLamp, Screen, Text, type LampState } from "../design";
import { Wordmark } from "./Wordmark";
import "./flow.css";

interface Signal {
  lamp: LampState;
  label: string;
  text: string;
}

const SIGNALS: readonly Signal[] = [
  { lamp: "red", label: "Stuck", text: "Plan stuck? Tag @deadlock in the chat." },
  { lamp: "amber", label: "Working", text: "It works out who is waiting on whom." },
  { lamp: "green", label: "Booked", text: "Everyone is in. The plan is booked." },
];

export interface LandingStepProps {
  /** The name of the chat a plan is running in, if any. */
  liveIn?: string | null;
  /** A WhatsApp is linked or a plan is running: offer the stage first. */
  live: boolean;
  wide: boolean;
  onSignUp: () => void;
}

/** The pitch, three signals from red to green, and one primary action. */
export function LandingStep({ live, liveIn, wide, onSignUp }: LandingStepProps) {
  return (
    <Screen
      width="wide"
      desktopAction="inline"
      header={<Wordmark size={wide ? 40 : 28} />}
      action={
        <div className="nf-actions">
          {live ? (
            <>
              <Button block className="nf-cta" href="/stage" newTab>
                Open stage
              </Button>
              <Button block variant="secondary" className="nf-cta" onClick={onSignUp}>
                Sign up again
              </Button>
            </>
          ) : (
            <Button block className="nf-cta" onClick={onSignUp}>
              Sign up
            </Button>
          )}
        </div>
      }
    >
      <div className="nf-landing">
        {live ? (
          <span className="nf-live-tag">
            <SignalLamp state="green" size="sm" />
            <Label strong>{liveIn ? `Live in ${liveIn}` : "Live on WhatsApp"}</Label>
          </span>
        ) : null}
        <div className="nf-hero">
          <Heading>
            Every group chat has a &ldquo;we should&rdquo; that dies. <span className="nf-hero-soft">Deadlock makes it happen.</span>
          </Heading>
        </div>
        <ol className="nf-sigs" aria-label="How it works">
          {SIGNALS.map((signal) => (
            <li key={signal.label} className="nf-sig">
              <span className="nf-sig-rail">
                <SignalLamp state={signal.lamp} />
                <span className="nf-sig-line" />
              </span>
              <span className="nf-sig-text">
                <Label strong>{signal.label}</Label>
                <Text muted>{signal.text}</Text>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Screen>
  );
}
