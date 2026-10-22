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
    blocking: viable ? [] : findBlocking(unmetPlanNeeds, commitments, met),
  };
}

function findBlocking(
  unmetPlanNeeds: Condition[],
  commitments: Commitment[],
  met: (c: Condition) => boolean,
): Condition[] {
  const waiting = commitments.filter((c) => c.status === "waiting");
  const offeredByWaiting = new Set(waiting.map((c) => c.offers));

  // Walk back from the plan's unmet needs through waiting commitments that
  // could provide them, collecting their unmet conditions.
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

  // Roots: unmet conditions no waiting commitment can fix by unlocking.
  // A pure cycle has no root, so fall back to everything unmet on the path.
  const roots = relevant.filter((c) => !offeredByWaiting.has(c.resource));
  return mergeByResource(roots.length ? roots : relevant);
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
