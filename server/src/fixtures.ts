import { getJSON, type Fetcher } from "./http";

// Upcoming fixtures from TheSportsDB (free; SPORTSDB_KEY optional, "123" is
// their public key). Null when unreachable, so callers fall back to naming
// no teams or times: we never invent a fixture.

const TIMEOUT_MS = Number(process.env.FIXTURES_TIMEOUT_MS ?? 4000);

/** TheSportsDB league ids. */
export const LEAGUES = {
  premierLeague: "4328",
  formula1: "4370",
  nfl: "4391",
  nba: "4387",
} as const;

export interface Fixture {
  title: string;          // "Arsenal v Tottenham" or "Brazilian Grand Prix"
  home: string | null;
  away: string | null;
  startsAt: Date | null;
  venue: string | null;
}

interface SportsDbEvents {
  events?: {
    strEvent: string;
    strHomeTeam?: string | null;
    strAwayTeam?: string | null;
    strTimestamp?: string | null; // UTC, "2026-10-24T14:00:00" or with +00:00
    dateEvent?: string | null;
    strTime?: string | null;
    strVenue?: string | null;
  }[] | null;
}

export function parseFixtures(body: SportsDbEvents | null): Fixture[] {
  return (body?.events ?? []).map((e) => {
    const stamp = e.strTimestamp ?? (e.dateEvent && e.strTime ? `${e.dateEvent}T${e.strTime}` : null);
    const at = stamp ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(stamp) ? stamp : `${stamp}Z`) : null;
    const home = e.strHomeTeam || null;
    const away = e.strAwayTeam || null;
    return {
      title: home && away ? `${home} v ${away}` : e.strEvent,
      home,
      away,
      startsAt: at && !Number.isNaN(at.getTime()) ? at : null,
      venue: e.strVenue || null,
    };
  });
}

export async function nextFixtures(leagueId: string, { offline = false, fetcher }: { offline?: boolean; fetcher?: Fetcher } = {}): Promise<Fixture[] | null> {
  if (offline) return null;
  const key = process.env.SPORTSDB_KEY?.trim() || "123";
  const url = `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(key)}/eventsnextleague.php?id=${leagueId}`;
  const body = await getJSON<SportsDbEvents>(url, TIMEOUT_MS, fetcher);
  return body ? parseFixtures(body) : null;
}

/** The soonest future fixture, preferring one with a team the chat mentioned. */
export function pickFixture(fixtures: Fixture[], teams: string[], now = new Date()): Fixture | null {
  const upcoming = fixtures
    .filter((f) => !f.startsAt || f.startsAt.getTime() > now.getTime())
    .sort((a, b) => (a.startsAt?.getTime() ?? Infinity) - (b.startsAt?.getTime() ?? Infinity));
  const mentions = (f: Fixture) => teams.some((t) => [f.home, f.away, f.title].some((x) => x?.toLowerCase().includes(t.toLowerCase())));
  return upcoming.find(mentions) ?? upcoming[0] ?? null;
}

/** "Sat 24 Oct, 15:00" in London time. */
export function londonLabel(at: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute}`;
}
