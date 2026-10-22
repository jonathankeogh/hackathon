import type { Person, Suggestion } from "@deadlock/shared/types";
import { agentAsking, blocked, booked, noPlan, halfUnlocked } from "../fixtures";
import { PERSON_COLORS, people as fixturePeople, waitingCommitments, withUnlocked } from "../fixtures/base";
import type { StateV2 } from "../stage/data/v2types";
import type { AdminConnection } from "./useAdminConnection";

const phones: Person[] = ["Alex", "Bea", "Chidi", "Dara"].map((name, i) => ({
  id: `ph${i + 1}`,
  name,
  color: PERSON_COLORS[i % PERSON_COLORS.length],
  source: "phone",
}));
const host: Person = { id: "p-host", name: "Host", color: "#EDEAE2", source: "seed" };

const withCast = (state: StateV2, joined: number): StateV2 => ({
  ...state,
  people: [host, ...fixturePeople, ...phones.slice(0, joined)],
});

const IDEAS: Suggestion = {
  id: "sg1",
  topic: "Premier League",
  people: ["p1", "p2", "p3"],
  area: "Shoreditch",
  status: "open",
  options: [
    { id: "live", title: "Arsenal v Tottenham", detail: "Sat 24 Oct, 17:30", plan: "Watch Arsenal v Tottenham together", votes: ["p1", "p2"] },
    { id: "venue", title: "Five-a-side pitch", detail: "Sun 25 Oct, 11:00", plan: "Play five-a-side", votes: ["p3"] },
    { id: "area", title: "Sports bar night", detail: "Fri 23 Oct, 19:00", plan: "Watch the match at a bar", votes: [] },
  ],
};

/** Dev preview states for the admin panel, keyed by the `?mock=` value. */
const STATES: Record<string, () => AdminConnection> = {
  idle: () => conn(withCast(noPlan, 0)),
  blocked: () => conn(withCast({ ...blocked, agentLog: ["Plan blocked, waiting on 15 attendees"] }, 3)),
  ask: () => conn(withCast(agentAsking, 4)),
  viable: () =>
    conn(
      withCast(
        { ...halfUnlocked, plan: { ...halfUnlocked.plan!, status: "viable" }, commitments: withUnlocked(waitingCommitments, ["c1", "c2", "c3", "c4"]), attendeeCount: 15, blocking: [] },
        4,
      ),
      "ph2",
    ),
  booked: () => conn(withCast(booked, 4), "ph2"),
  ideas: () => conn(withCast({ ...noPlan, suggestion: IDEAS }, 3)),
  offline: () => ({ ...conn(withCast(blocked, 3)), connected: false }),
  denied: () => ({ ...conn(withCast(blocked, 3)), denied: true, locked: true }),
};

function conn(state: StateV2, callTarget: string | null = null): AdminConnection {
  return { state, connected: true, denied: false, locked: false, callTarget, announced: null };
}

/**
 * Dev-only preview of the admin panel: `/admin?mock=idle|blocked|ask|ideas|viable|booked|offline|denied`.
 * Returns null in production builds and for any other query, so the real socket drives the page.
 * In a preview nothing is ever emitted.
 */
export function readAdminMock(search: string, dev: boolean = import.meta.env.DEV): AdminConnection | null {
  if (!dev) return null;
  const key = new URLSearchParams(search).get("mock");
  return key && key in STATES ? STATES[key]() : null;
}
