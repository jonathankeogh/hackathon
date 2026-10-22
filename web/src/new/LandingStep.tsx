import { LandingPage } from "../landing/LandingPage";

export interface LandingStepProps {
  /** The name of the chat a plan is running in, if any. */
  liveIn?: string | null;
  /** A WhatsApp is linked or a plan is running: offer the stage first. */
  live: boolean;
  onSignUp: () => void;
}

/** The landing step of the organiser flow: the full landing page, handing off to sign up. */
export function LandingStep({ live, liveIn, onSignUp }: LandingStepProps) {
  return <LandingPage live={live} liveIn={liveIn} onSignUp={onSignUp} />;
}
