/**
 * Which ids are new since the last render, as a map from id to its position within that
 * batch (0, 1, 2...), so simultaneous arrivals can be staggered. Ids already seen are absent.
 */
export function entranceIndexes(seen: ReadonlySet<string>, ids: readonly string[]): ReadonlyMap<string, number> {
  const fresh = new Map<string, number>();
  for (const id of ids) if (!seen.has(id) && !fresh.has(id)) fresh.set(id, fresh.size);
  return fresh;
}
