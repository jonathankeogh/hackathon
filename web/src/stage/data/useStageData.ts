import { fixtureFromSearch } from "./urlParams";
import { useLiveData } from "./useLiveData";
import type { StageData } from "./types";

const NO_EVENTS: StageData["events"] = [];
const FIXTURE = fixtureFromSearch(typeof location === "undefined" ? "" : location.search);

/**
 * The single data source for the stage. The stage is passive: the server drives everything
 * over the socket. `?fixture=<name>` renders one static snapshot instead (no events, no
 * stream, nothing on screen says so). The live hook always runs (hook order must be stable)
 * but is disabled when a fixture is shown.
 */
export function useStageData(): StageData {
  const live = useLiveData(FIXTURE === null);
  if (FIXTURE !== null) return { ready: true, state: FIXTURE, events: NO_EVENTS, streaming: null };
  return { ready: live.ready, state: live.state, events: live.events, streaming: live.streaming };
}
