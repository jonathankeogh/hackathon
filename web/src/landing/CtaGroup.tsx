import { Button } from "../design";

export interface CtaGroupProps {
  /** A WhatsApp is linked or a plan is running: offer the stage first. */
  live: boolean;
  onSignUp: () => void;
  size?: "md" | "sm";
  /** In the nav only the one primary action shows. */
  compact?: boolean;
}

/** "Sign up", or "Open stage" first when an event is live. The only way the page hands off to the flow. */
export function CtaGroup({ live, onSignUp, size = "md", compact = false }: CtaGroupProps) {
  if (!live) {
    return (
      <Button size={size} className="lp-cta" onClick={onSignUp}>
        Sign up
      </Button>
    );
  }
  return (
    <>
      <Button size={size} className="lp-cta" href="/stage" newTab>
        Open stage
      </Button>
      {compact ? null : (
        <Button size={size} variant="secondary" className="lp-cta" onClick={onSignUp}>
          Sign up again
        </Button>
      )}
    </>
  );
}
