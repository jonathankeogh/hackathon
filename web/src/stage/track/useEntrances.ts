import { useEffect, useRef } from "react";
import { entranceIndexes } from "./entrances";

/**
 * The ids that arrived since the last commit, with their batch index. Whatever is there on
 * first mount counts as seen, so a reload or a fresh stage does not replay entrances; ids that
 * leave are forgotten, so one that comes back enters again.
 */
export function useEntrances(ids: readonly string[]): ReadonlyMap<string, number> {
  const seen = useRef<ReadonlySet<string> | null>(null);
  if (seen.current === null) seen.current = new Set(ids);
  const fresh = entranceIndexes(seen.current, ids);
  useEffect(() => {
    seen.current = new Set(ids);
  });
  return fresh;
}
