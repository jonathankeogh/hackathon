import { useServerState } from "../../useServerState";
import { emptyState } from "./emptyState";
import type { StageEventEnvelope } from "./types";
import { liveStreaming } from "./liveStreaming";
import { useStageEvents } from "./useStageEvents";
import type { StateV2 } from "./v2types";

/**
 * Live data source: the skeleton's shared socket snapshot (empty state until the first
 * `state` arrives) plus the transient events and the raw streamed explanation (`streamed`). Always runs; `enabled` only gates the event
 * subscriptions, so a `?fixture=` snapshot never records live events.
 */
export function useLiveData(enabled: boolean): { state: StateV2; events: readonly StageEventEnvelope[]; streaming: string | null; ready: boolean } {
  const { state, streamed } = useServerState();
  const events = useStageEvents(enabled);
  return { state: state ?? emptyState, events, streaming: liveStreaming(streamed, state?.explanation ?? ""), ready: state !== null };
}
