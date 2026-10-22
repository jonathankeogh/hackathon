import type { EventDetails } from "@deadlock/shared/types";
import type { StateV2 } from "./v2types";

/**
 * Transient socket events (CONTRACT.md "Server to all clients") that are not part of State.
 * Unit B fills in the live handling; Unit A only defines the shape.
 */
export type StageEvent =
  | { type: "cascade"; order: string[] }
  | { type: "explain:chunk"; text: string }
  | { type: "booked"; event: EventDetails };

/** An event with a monotonically increasing sequence number, so consumers can track what they have seen. */
export interface StageEventEnvelope {
  seq: number;
  receivedAt: number;
  event: StageEvent;
}

export interface StageData {
  /** False until the first server snapshot has arrived (always true for a `?fixture=` snapshot). */
  ready: boolean;
  /** Read through the v2 type: the v2 fields are optional, so an older server still works. */
  state: StateV2;
  /** Append-only log of transient socket events since page load (empty for a fixture). */
  events: readonly StageEventEnvelope[];
  /** The explanation as it streams in, or null when nothing is streaming. */
  streaming: string | null;
}
