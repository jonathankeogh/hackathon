import type { StateV2 } from "../stage/data/v2types";
import { baseState, makePlan, waitingCommitments } from "./base";

/** Plan detected, every commitment waiting, short of the 15 attendees everything hinges on. */
export const blocked: StateV2 = {
  ...baseState,
  plan: makePlan("blocked"),
  commitments: waitingCommitments,
  attendeeCount: 3,
  blocking: [{ resource: "attendees", minCount: 15 }],
  explanation:
    "Everything hinges on attendance: 12 more people unlocks Priya's office, which unlocks Sam's talk and the laptops.",
};
