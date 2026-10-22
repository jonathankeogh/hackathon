import type { StateV2 } from "../stage/data/v2types";
import { baseState, makePlan, waitingCommitments, withUnlocked } from "./base";

/**
 * Mid-cascade snapshot: 15 attendees reached, the venue has clicked green, the speaker,
 * laptops and food have not landed yet. `blocking` lists the resources still pending.
 */
export const halfUnlocked: StateV2 = {
  ...baseState,
  plan: makePlan("blocked"),
  commitments: withUnlocked(waitingCommitments, ["c1"]),
  attendeeCount: 15,
  blocking: [{ resource: "speaker" }, { resource: "laptops" }],
  explanation:
    "Attendance hit 15, so Priya's office is confirmed. Sam's talk and the laptops are the last pieces still to land.",
};
