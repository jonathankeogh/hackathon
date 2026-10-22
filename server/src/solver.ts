import type { Commitment, Condition, ResourceKey } from "@deadlock/shared/types";

// Deterministic: Grok extracts commitments, this decides what unlocks. No LLM here.

export interface SolverInput {
  commitments: Commitment[];
  attendeeCount: number;
  requiredForPlan: ResourceKey[];
  /** Plan-level bar for "attendees" when it is in requiredForPlan. */
  attendeeTarget?: number;
  /** Other counted resources, e.g. { laptops: 4 } from RSVPs. */
  counts?: Record<ResourceKey, number>;
}

export interface SolverResult {
  /** Commitment ids in unlock order, for the cascade animation. */
  order: string[];
  /** Copies of the input commitments with status set. */
  commitments: Commitment[];
  /** How much of each resource is available after solving. */
  available: Record<ResourceKey, number>;
  viable: boolean;
  /** Root-cause unmet conditions: what Call B explains and the stage highlights. */
  blocking: Condition[];
}

export const ATTENDEES = "attendees";

export function normalizeKey(key: ResourceKey): ResourceKey {
  return key.trim().toLowerCase();
}

function needed(c: Condition): number {
  return c.minCount ?? 1;
}

export function solve(input: SolverInput): SolverResult {
  const commitments = input.commitments.map((c) => ({
    ...c,
    offers: normalizeKey(c.offers),
    requires: c.requires.map((r) => ({ ...r, resource: normalizeKey(r.resource) })),
    status: "waiting" as Commitment["status"],
  }));
  const required = [...new Set(input.requiredForPlan.map(normalizeKey))];

  const available: Record<ResourceKey, number> = {};
  for (const [key, n] of Object.entries(input.counts ?? {})) {
    available[normalizeKey(key)] = (available[normalizeKey(key)] ?? 0) + n;
  }
  available[ATTENDEES] = (available[ATTENDEES] ?? 0) + input.attendeeCount;

  const met = (c: Condition) => (available[c.resource] ?? 0) >= needed(c);

  // Fixed point. Within a pass, later commitments see earlier unlocks, so the
  // order is causal and stable for a given input order.
  const order: string[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of commitments) {
      if (c.status === "unlocked" || !c.requires.every(met)) continue;
      c.status = "unlocked";
      available[c.offers] = (available[c.offers] ?? 0) + 1;
      order.push(c.id);
      changed = true;
    }
  }

  const planNeeds = (key: ResourceKey): Condition =>
    key === ATTENDEES && input.attendeeTarget !== undefined
      ? { resource: key, minCount: input.attendeeTarget }
      : { resource: key };
  const unmetPlanNeeds = required.map(planNeeds).filter((c) => !met(c));
  const viable = unmetPlanNeeds.length === 0;

  return {
    order,
    commitments: commitments.map((c, i) => ({ ...input.commitments[i], status: c.status })),
    available,
    viable,
    blocking: viable ? [] : findBlocking(unmetPlanNeeds, commitments, met, available),
  };
}

function findBlocking(
  unmetPlanNeeds: Condition[],
  commitments: Commitment[],
  met: (c: Condition) => boolean,
  available: Record<ResourceKey, number>,
): Condition[] {
  const waiting = commitments.filter((c) => c.status === "waiting");
  const offeredByWaiting = new Set(waiting.map((c) => c.offers));

  // Conditions within one provider are ALL needed; providers of the same
  // resource are alternatives. Keep whole paths until required branches have
  // been combined, so a shared root can beat locally cheaper separate roots.
  // Bound combinatorial alternatives for live-stage latency: beyond 128 paths
  // per expansion this is a deterministic sufficient set, not a global minimum.
  const PATH_LIMIT = 128;
  let expansions = 0;
  const cyclicConditions: Condition[] = [];
  const shortfall = (path: Condition[]) => path.reduce((sum, c) => sum + Math.max(0, needed(c) - (available[c.resource] ?? 0)), 0);
  const best = (paths: Condition[][]): Condition[][] => {
    const distinct = new Map<string, Condition[]>();
    for (const path of paths) {
      const merged = mergeByResource(path);
      const key = merged.map((c) => `${c.resource}:${needed(c)}`).sort().join("|");
      if (!distinct.has(key)) distinct.set(key, merged);
    }
    return [...distinct.values()].sort((a, b) => a.length - b.length || shortfall(a) - shortfall(b)).slice(0, PATH_LIMIT);
  };
  const together = (left: Condition[][], right: Condition[][]): Condition[][] =>
    best(left.flatMap((a) => right.map((b) => [...a, ...b])));
  const all = (conditions: Condition[], visiting: Set<ResourceKey>): Condition[][] => {
    let paths: Condition[][] = [[]];
    for (const condition of conditions) {
      // Visit later branches even after no sufficient path remains: their
      // cycles still belong in the conservative fallback diagnostic.
      paths = together(paths, options(condition, visiting));
    }
    return paths;
  };
  const options = (condition: Condition, visiting: Set<ResourceKey>): Condition[][] => {
    if (met(condition)) return [[]];
    if (visiting.has(condition.resource)) {
      cyclicConditions.push(condition);
      return [];
    }
    if (++expansions > 4000) return [];
    const providers = waiting.filter((c) => c.offers === condition.resource);
    if (!providers.length) return [[condition]];

    const next = new Set(visiting).add(condition.resource);
    const missing = Math.ceil(needed(condition) - (available[condition.resource] ?? 0));
    const count = Math.min(missing, providers.length);
    // Each commitment supplies one unit. Counted conditions may require several
    // distinct providers; choosing just the cheapest one would under-report.
    const choices: Condition[][][] = Array.from({ length: count + 1 }, () => []);
    choices[0] = [[]];
    for (const provider of providers) {
      const paths = all(provider.requires, next);
      for (let n = count; n > 0; n--) {
        choices[n] = best([...choices[n], ...together(choices[n - 1], paths)]);
      }
    }
    const paths = choices[count];
    if (missing <= providers.length) return paths;
    // Even all providers leave a counted shortage. Include the extra external
    // supply needed in addition to their prerequisites.
    const remainder = { ...condition, minCount: needed(condition) - providers.length };
    return met(remainder) ? paths : paths.map((path) => [...path, remainder]);
  };
  const paths = all(unmetPlanNeeds, new Set());
  if (paths.length) return best(paths)[0];

  // Walk back from the plan's unmet needs through waiting commitments that
  // could provide them. Cycles (or an exhausted search budget) have no proven
  // sufficient path: retain the conservative diagnostic instead of inventing one.
  const relevant: Condition[] = [];
  const seen = new Set<ResourceKey>();
  const queue = [...unmetPlanNeeds];
  while (queue.length) {
    const cond = queue.shift()!;
    relevant.push(cond);
    if (seen.has(cond.resource)) continue;
    seen.add(cond.resource);
    for (const c of waiting) {
      if (c.offers === cond.resource) queue.push(...c.requires.filter((r) => !met(r)));
    }
  }

  // A root alone cannot break a counted cycle. Keep cyclic conditions as
  // explicit external-supply bars, and retain shortages even all providers
  // cannot fill. This fallback is conservative, not minimal. If the expansion
  // budget was exhausted (or a pure cycle has no roots), retain every relevant
  // unmet condition; supplying those necessarily satisfies the plan itself.
  const roots = relevant.filter((c) => !offeredByWaiting.has(c.resource));
  const shortages = relevant.filter((c) => needed(c) > (available[c.resource] ?? 0)
    + waiting.filter((provider) => provider.offers === c.resource).length);
  return mergeByResource(roots.length && expansions <= 4000
    ? [...roots, ...cyclicConditions, ...shortages]
    : relevant);
}

// One condition per resource, keeping the highest bar.
function mergeByResource(conditions: Condition[]): Condition[] {
  const byKey = new Map<ResourceKey, Condition>();
  for (const c of conditions) {
    const prev = byKey.get(c.resource);
    if (!prev || needed(c) > needed(prev)) byKey.set(c.resource, c);
  }
  return [...byKey.values()];
}
