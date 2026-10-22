import type { StateV2 } from "../stage/data/v2types";
import { baseState, eventDetails, makePlan, waitingCommitments, withUnlocked } from "./base";

/** Everything unlocked, the plan booked, event page generated. */
export const booked: StateV2 = {
  ...baseState,
  plan: makePlan("booked"),
  commitments: withUnlocked(waitingCommitments, ["c1", "c2", "c3", "c4"]),
  attendeeCount: 17,
  blocking: [],
  explanation: "Every condition is met, so the workshop is booked.",
  event: eventDetails,
};
