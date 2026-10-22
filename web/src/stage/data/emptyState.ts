import type { StateV2 } from "./v2types";

/** What the stage shows before the first `state` snapshot arrives from the server. */
export const emptyState: StateV2 = {
  people: [],
  messages: [],
  plan: null,
  commitments: [],
  attendeeCount: 0,
  attendeeTarget: 15,
  blocking: [],
  explanation: "",
  event: null,
  mock: false,
  asks: [],
  agentLog: [],
};
