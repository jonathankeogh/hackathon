import type { Commitment } from "@deadlock/shared/types";
import type { Ask, ChatSource, MessageV2, StateV2 } from "../stage/data/v2types";
import { baseState, makePlan, messages, waitingCommitments } from "./base";
import { blocked } from "./blocked";

/** Priya is the bottleneck: her office needs 15 and the room is stuck at 12. */
const PRIYA = "p1";
const VENUE_ID = "c1";

export const whatsappSource: ChatSource = { kind: "whatsapp", label: "WHATSAPP · London Grok builders" };

/** The same ten messages, two of them marked as having come in over WhatsApp. */
const whatsappMessages: MessageV2[] = messages.map((m) => (m.id === "m5" || m.id === "m8" ? { ...m, source: "whatsapp" } : m));

export const askQuestion = "Priya, would your office work with 12 people?";

export const openAsk: Ask = {
  id: "a1",
  personId: PRIYA,
  question: askQuestion,
  proposal: { commitmentId: VENUE_ID, requires: [{ resource: "attendees", minCount: 12 }] },
  status: "open",
};

/** The log the agent has written by the time it asks. */
export const askingLog: readonly string[] = [
  "Plan blocked for 8s, no progress",
  "Bottleneck: venue needs 15+, have 12",
  "Asking Priya if 12 people is enough",
];

export const acceptedLogLine = "Priya said yes: venue now needs 12+";

/** The commitments once Priya has said yes: only her venue condition changes. */
export const relaxedCommitments: Commitment[] = waitingCommitments.map((c) =>
  c.id === VENUE_ID ? { ...c, requires: openAsk.proposal.requires } : c,
);

/** Stuck at 12 of 15 with the agent's question to Priya open. */
export const agentAsking: StateV2 = {
  ...baseState,
  ...blocked,
  messages: whatsappMessages,
  attendeeCount: 12,
  blocking: [{ resource: "attendees", minCount: 15 }],
  explanation: "Priya's office needs 15 people and only 12 are in. The agent is asking her whether 12 is enough.",
  agentLog: [...askingLog],
  asks: [openAsk],
  chatSource: whatsappSource,
};

/** Priya said yes: her condition is now 12+, the solver is about to unlock the chain. */
export const askAccepted: StateV2 = {
  ...agentAsking,
  plan: makePlan("blocked"),
  commitments: relaxedCommitments,
  blocking: [],
  explanation: "Priya agreed to open the office at 12 people, so the talk, the laptops and the pizza can follow.",
  agentLog: [...askingLog, acceptedLogLine],
  asks: [{ ...openAsk, status: "accepted" }],
};
