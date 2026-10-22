import "./design.css";
import { Label } from "./Label";
import { SignalLamp, type LampState } from "./SignalLamp";

export interface Step {
  id: string;
  /** Short, one or two words. */
  label: string;
}

export interface StepRailProps {
  steps: readonly Step[];
  /** Id of the current step. Steps before it are done, steps after it are upcoming. */
  current: string;
  /** Mark every step done (the last screen). */
  complete?: boolean;
}

export type StepStatus = "done" | "current" | "upcoming";

export function stepStatus(index: number, currentIndex: number, complete: boolean): StepStatus {
  if (complete || index < currentIndex) return "done";
  return index === currentIndex ? "current" : "upcoming";
}

const LAMP: Record<StepStatus, LampState> = { done: "green", current: "amber", upcoming: "off" };

/**
 * Onboarding progress as a row of signal lamps: done green, current amber, upcoming off, with
 * a short mono label under each. A hairline joins the lamps and turns green behind done steps.
 */
export function StepRail({ steps, current, complete = false }: StepRailProps) {
  const currentIndex = Math.max(0, steps.findIndex((s) => s.id === current));
  return (
    <ol className="ds-rail" aria-label="Progress">
      {steps.map((step, i) => {
        const status = stepStatus(i, currentIndex, complete);
        return (
          <li key={step.id} className="ds-rail-step" data-status={status} aria-current={status === "current" ? "step" : undefined}>
            <div className="ds-rail-track">
              <span className="ds-rail-line" data-hidden={i === 0} data-done={status !== "upcoming" && i > 0} />
              <SignalLamp state={LAMP[status]} flash />
              <span className="ds-rail-line" data-hidden={i === steps.length - 1} data-done={status === "done" && i < steps.length - 1} />
            </div>
            <Label strong={status === "current"} className="ds-rail-label">
              {step.label}
              <span className="ds-sr-only"> ({status})</span>
            </Label>
          </li>
        );
      })}
    </ol>
  );
}
