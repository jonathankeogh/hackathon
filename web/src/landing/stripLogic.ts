import { STRIP_PLANS, type Plan } from "./content";

export type StripStatus = "blocked" | "waiting" | "booked";

const ORDER: readonly StripStatus[] = ["blocked", "waiting", "booked"];

export interface StripRow {
  plan: Plan;
  status: StripStatus;
  /** Who the plan is waiting on; nobody once it is booked. */
  waitingOn: string;
}

/** Row `row` of the hero departures strip after `tick` steps. Rows are offset so they never match. */
export function stripRow(tick: number, row: number): StripRow {
  const n = STRIP_PLANS.length;
  const plan = STRIP_PLANS[(((tick + row * 2) % n) + n) % n]!;
  const status = ORDER[(((tick + row) % ORDER.length) + ORDER.length) % ORDER.length]!;
  return { plan, status, waitingOn: status === "booked" ? "NOBODY" : plan.waitingOn };
}

/** In a marquee of `n` plans, item i is booked while the wave of `width` items passes over it. */
export function wavesBooked(i: number, tick: number, n: number, width = 2): boolean {
  return (((tick - i) % n) + n) % n < width;
}
