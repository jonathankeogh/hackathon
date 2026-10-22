import type { Commitment, Plan, State } from "@deadlock/shared/types";
import type { CascadeSnapshot, DisplayStatus } from "../cascade/sequencer";

/** The part of the cascade snapshot that decides what the track shows right now. */
export type CascadeView = Pick<CascadeSnapshot, "displayedStatus" | "planLit">;

/** The one place lamp colour is derived (IMPLEMENTATION-NOTES decision 5). */
export type LampStatus = "red" | "amber" | "green" | "off";

const isBlocking = (state: State, resource: string): boolean =>
  state.blocking.some((b) => b.resource === resource);

/**
 * `displayed` overrides `commitment.status`: the cascade shows unlocks one at a time, so a
 * commitment the server already unlocked can still be waiting on screen.
 */
export function commitmentLamp(commitment: Commitment, state: State, displayed?: DisplayStatus): LampStatus {
  if ((displayed ?? commitment.status) === "unlocked") return "green";
  if (commitment.requires.some((r) => isBlocking(state, r.resource))) return "red";
  return "amber";
}

/** Headcount the audience must reach: the largest minCount asked of `attendees`, else the target. */
export function audienceThreshold(state: State): number {
  const counts = state.commitments
    .flatMap((c) => c.requires)
    .filter((r) => r.resource === "attendees" && typeof r.minCount === "number")
    .map((r) => r.minCount as number);
  return counts.length > 0 ? Math.max(...counts) : state.attendeeTarget;
}

export function audienceLamp(state: State): LampStatus {
  if (state.attendeeCount >= audienceThreshold(state)) return "green";
  return isBlocking(state, "attendees") ? "red" : "amber";
}

/** `planLit` false holds a viable or booked plan at red until the cascade reaches it. */
export function planLamp(plan: Plan | null, planLit = true): LampStatus {
  switch (plan?.status) {
    case "blocked":
      return "red";
    case "viable":
    case "booked":
      return planLit ? "green" : "red";
    default:
      return "off";
  }
}

/** Status of any track node, so connectors and labels can share the lamp's colour source. */
export function nodeLamp(
  kind: "audience" | "commitment" | "plan",
  commitment: Commitment | undefined,
  state: State,
  view?: CascadeView,
): LampStatus {
  if (kind === "audience") return audienceLamp(state);
  if (kind === "plan") return planLamp(state.plan, view?.planLit);
  return commitment ? commitmentLamp(commitment, state, view?.displayedStatus[commitment.id]) : "off";
}

/** The plan as the stage shows it: viable and booked wait for the PLAN lamp to light first. */
export function displayedPlan(plan: Plan | null, planLit: boolean): Plan | null {
  if (plan === null || planLit) return plan;
  return plan.status === "viable" || plan.status === "booked" ? { ...plan, status: "blocked" } : plan;
}
