import { fixtures } from "../../fixtures";
import type { StateV2 } from "./v2types";

/**
 * The state of the fixture named by `?fixture=<name>` (noPlan, blocked, halfUnlocked, booked,
 * agentAsking, askAccepted), or null for no or an unknown name, which means "go live".
 */
export function fixtureFromSearch(search: string): StateV2 | null {
  const name = new URLSearchParams(search).get("fixture");
  if (name === null) return null;
  return fixtures.find((f) => f.key === name)?.state ?? null;
}

/** Stage sound is on only with `?sound=1`. */
export function soundFromSearch(search: string): boolean {
  return new URLSearchParams(search).get("sound") === "1";
}
