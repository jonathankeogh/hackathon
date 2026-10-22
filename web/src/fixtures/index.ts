import type { StateV2 } from "../stage/data/v2types";
import { agentAsking, askAccepted } from "./agent";
import { blocked } from "./blocked";
import { booked } from "./booked";
import { halfUnlocked } from "./halfUnlocked";
import { noPlan } from "./noPlan";

export interface Fixture {
  key: "noPlan" | "blocked" | "halfUnlocked" | "booked" | "agentAsking" | "askAccepted";
  label: string;
  state: StateV2;
}

/** Ordered as the demo plays out. Shared with Person 4 for phone-view development. */
export const fixtures: readonly Fixture[] = [
  { key: "noPlan", label: "NO PLAN", state: noPlan },
  { key: "blocked", label: "BLOCKED", state: blocked },
  { key: "halfUnlocked", label: "HALF UNLOCKED", state: halfUnlocked },
  { key: "booked", label: "BOOKED", state: booked },
  { key: "agentAsking", label: "AGENT ASKING", state: agentAsking },
  { key: "askAccepted", label: "ASK ACCEPTED", state: askAccepted },
];

export { noPlan, blocked, halfUnlocked, booked, agentAsking, askAccepted };
