import type { Evidence, Message, PlanOption, Suggestion } from "@deadlock/shared/types";
import { londonLabel, LEAGUES, type Fixture } from "./fixtures";
import type { AreaGuide } from "./meetTips";

// Before anyone says "we should": when enough different people in the chat
// are on the same topic (the Premier League, F1, gigs...), offer a plan with
// three options: something live, a place to go, and something in the area.
// Keyword rules, no network; fixtures and Grok only fill in names.

export const QUORUM = Number(process.env.SUGGEST_QUORUM ?? 3);
export const WINDOW = Number(process.env.SUGGEST_WINDOW ?? 20);

type Text = { title: string; detail: string; plan: string };

export interface Topic {
  key: string;
  label: string;
  match: RegExp;
  /** TheSportsDB league for the live option. */
  league?: string;
  /** Watched in a sports bar: "Match", "Race", "Game" for the plan title. */
  sport?: string;
  /** Fallbacks; {station}, {team} and {topic} are filled in. */
  live: Text;
  venue: Text;
  area?: Text;
}

export const TOPICS: Topic[] = [
  {
    key: "football",
    label: "Premier League",
    match: /\b(premier league|the prem|football|footy|arsenal|gunners|spurs|tottenham|chelsea|man (utd|united|city)|liverpool|newcastle|aston villa|villa|west ham|everton|fulham|brentford|crystal palace|bournemouth|wolves|nottingham forest|leeds|burnley|sunderland|kick-?off|title race|derby day|five-a-side|5-a-side)\b/i,
    league: LEAGUES.premierLeague,
    sport: "Match",
    live: { title: "{team}'s next match", detail: "Premier League, kick-off to confirm", plan: "{team}'s next match" },
    venue: { title: "A sports pub near {station}", detail: "Big screen, book a table for the group", plan: "Football near {station}" },
    area: { title: "Five-a-side near {station}", detail: "Then {nearby}", plan: "Five-a-side near {station}" },
  },
  {
    key: "f1",
    label: "Formula 1",
    match: /\b(f1|formula ?(1|one)|grand prix|quali(fying)?|verstappen|hamilton|norris|leclerc|piastri)\b/i,
    league: LEAGUES.formula1,
    sport: "Race",
    live: { title: "The next Grand Prix", detail: "Formula 1, start time to confirm", plan: "The next Grand Prix" },
    venue: { title: "A sports bar near {station}", detail: "Race on the big screen", plan: "F1 near {station}" },
  },
  {
    key: "nfl",
    label: "NFL",
    match: /\b(nfl|super bowl|touchdown|chiefs|eagles|patriots|quarterback)\b/i,
    league: LEAGUES.nfl,
    sport: "Game",
    live: { title: "The next NFL game", detail: "NFL, kick-off to confirm", plan: "The next NFL game" },
    venue: { title: "A sports bar near {station}", detail: "Late kick-offs, book a booth", plan: "NFL near {station}" },
  },
  {
    key: "gigs",
    label: "Live music",
    match: /\b(gigs?|concerts?|live music|band|dj set|festival|new album|tickets for)\b/i,
    live: { title: "A gig near {station}", detail: "Live music this week", plan: "A gig near {station}" },
    venue: { title: "A music bar near {station}", detail: "Drinks with a band or DJ on", plan: "Live music near {station}" },
  },
  {
    key: "comedy",
    label: "Comedy",
    match: /\b(comedy|stand-?up|comedian|open mic|improv)\b/i,
    live: { title: "A comedy night near {station}", detail: "Stand-up this week", plan: "Comedy near {station}" },
    venue: { title: "Drinks near {station} first", detail: "Then on to the show", plan: "Drinks near {station}" },
  },
  {
    key: "games",
    label: "Games night",
    match: /\b(board games?|pub quiz|quiz night|darts|ping pong|bowling|karaoke|pool table|mini golf)\b/i,
    live: { title: "A pub quiz near {station}", detail: "Weeknight quiz, teams of up to 6", plan: "Pub quiz near {station}" },
    venue: { title: "A games bar near {station}", detail: "Darts, ping pong or board games", plan: "Games night near {station}" },
  },
  {
    key: "food",
    label: "Food",
    match: /\b(ramen|curry|dim sum|tacos|street food|supper club|brunch|bottomless|tasting menu|foodie|new restaurant)\b/i,
    live: { title: "A street food market", detail: "Lots of stalls, everyone picks", plan: "Street food crawl" },
    venue: { title: "A group table near {station}", detail: "Somewhere that takes bookings for 8+", plan: "Dinner near {station}" },
  },
];

/** Well-known places that screen the big games. Others get a generic "sports pub near ...". */
const SPORTS_BARS: Record<string, { name: string; detail: string }> = {
  Shoreditch: { name: "Boxpark Shoreditch", detail: "Big screens for the big games, street food" },
};

/** Chat words → the club name TheSportsDB uses. */
const TEAMS: [RegExp, string][] = [
  [/\b(arsenal|gunners)\b/i, "Arsenal"],
  [/\b(spurs|tottenham)\b/i, "Tottenham"],
  [/\bchelsea\b/i, "Chelsea"],
  [/\b(man(chester)? (utd|united))\b/i, "Manchester United"],
  [/\bman(chester)? city\b/i, "Manchester City"],
  [/\bliverpool\b/i, "Liverpool"],
  [/\bnewcastle\b/i, "Newcastle"],
  [/\b(aston )?villa\b/i, "Aston Villa"],
  [/\b(west ham|hammers)\b/i, "West Ham"],
  [/\beverton\b/i, "Everton"],
  [/\bfulham\b/i, "Fulham"],
  [/\bbrentford\b/i, "Brentford"],
  [/\bcrystal palace\b/i, "Crystal Palace"],
  [/\bbournemouth\b/i, "Bournemouth"],
  [/\bwolves\b/i, "Wolves"],
  [/\b(nottingham )?forest\b/i, "Nottingham Forest"],
  [/\bleeds\b/i, "Leeds"],
  [/\bburnley\b/i, "Burnley"],
  [/\bsunderland\b/i, "Sunderland"],
];

export const OPTION_ORDER: PlanOption["id"][] = ["live", "venue", "area"];

const isBot = (m: Message) => m.text.startsWith("🤖");

/** Teams named in these messages, most-mentioned first. */
export function teamsIn(messages: Message[]): string[] {
  const n = new Map<string, number>();
  for (const m of messages) for (const [re, team] of TEAMS) if (re.test(m.text)) n.set(team, (n.get(team) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

/**
 * The topic most people are on in the last `window` messages, if at least
 * `minPeople` different people mentioned it. Ties go to the topic mentioned
 * most recently.
 */
export function findQuorum(messages: Message[], { minPeople = QUORUM, window = WINDOW, skip = new Set<string>() } = {}) {
  const recent = messages.filter((m) => !isBot(m)).slice(-window);
  let best: { topic: Topic; people: string[]; last: number } | null = null;
  for (const topic of TOPICS) {
    if (skip.has(topic.key)) continue;
    const hits = recent.map((m, i) => [m, i] as const).filter(([m]) => topic.match.test(m.text));
    const people = [...new Set(hits.map(([m]) => m.personId))];
    if (people.length < minPeople) continue;
    const last = hits[hits.length - 1][1];
    if (!best || people.length > best.people.length || (people.length === best.people.length && last > best.last)) best = { topic, people, last };
  }
  if (!best) return null;
  const onTopic = recent.filter((m) => best!.topic.match.test(m.text));
  return { topic: best.topic, people: best.people, teams: best.topic.key === "football" ? teamsIn(onTopic) : [] };
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Three options for a topic: live (a real fixture when we have one), a place to go, something in the area. */
export function buildOptions(topic: Topic, ctx: { area: AreaGuide | null; fixture: Fixture | null; teams: string[] }): PlanOption[] {
  const station = ctx.area?.station ?? "you";
  const team = ctx.teams[0];
  const fill = (t: Text): Text => {
    const f = (s: string) =>
      s
        .replace(/\{team\}'s next match/g, team ? `${team}'s next match` : `the next ${topic.label} game`)
        .replace(/\{station\}/g, station)
        .replace(/\{topic\}/g, topic.label)
        .replace(/\{nearby\}/g, ctx.area?.nearby[0] ? lowerFirst(ctx.area.nearby[0]) : "the pub");
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return { title: cap(f(t.title)), detail: f(t.detail), plan: cap(f(t.plan)) };
  };

  const when = ctx.fixture?.startsAt ? londonLabel(ctx.fixture.startsAt) : undefined;
  const live: Text = ctx.fixture
    ? { title: ctx.fixture.title, detail: `${when ?? "Time to confirm"}, ${topic.label}`, plan: ctx.fixture.title }
    : fill(topic.live);

  const bar = topic.sport && ctx.area ? SPORTS_BARS[ctx.area.name] : undefined;
  const venue: Text & { where?: string } = bar
    ? { title: bar.name, detail: bar.detail, plan: `${topic.sport} at ${bar.name}`, where: bar.name }
    : { ...fill(topic.venue), where: ctx.area ? `Near ${station}` : undefined };

  const areaText: Text = topic.area
    ? fill(topic.area)
    : ctx.area
      ? { title: ctx.area.nearby[0], detail: `In ${ctx.area.name}, near ${station}`, plan: `${topic.label} in ${ctx.area.name}` }
      : { title: "Something local", detail: "Pick a spot near most people", plan: `${topic.label} meet-up` };
  // Plan titles go on the 30-cell departures board.

  return [
    { id: "live", ...live, when, votes: [] },
    { id: "venue", title: venue.title, detail: venue.detail, plan: venue.plan, when: ctx.fixture ? when : undefined, where: venue.where, votes: [] },
    { id: "area", ...areaText, where: ctx.area ? ctx.area.name : undefined, votes: [] },
  ];
}

/** "1", "2!", "option 3", "number two", "the second one" → option id, else null. */
export function parseVote(text: string): PlanOption["id"] | null {
  const t = text.trim().toLowerCase();
  const words: Record<string, number> = { one: 1, first: 1, two: 2, second: 2, three: 3, third: 3 };
  const m =
    /^([123])\s*[!.)]*$/.exec(t) ??
    /\b(?:option|number|no\.?|#)\s*([123]|one|two|three)\b/.exec(t) ??
    /\bthe (first|second|third)( one)?\b/.exec(t);
  if (!m) return null;
  const n = Number(m[1]) || words[m[1]];
  return OPTION_ORDER[n - 1] ?? null;
}

/** The bot's message into the chat. */
export function suggestionText(s: Pick<Suggestion, "topic" | "options">, names: string[]): string {
  const who = names.length > 3 ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more` : names.join(", ").replace(/, ([^,]*)$/, " and $1");
  const lines = s.options.map((o, i) => `${i + 1}. ${o.title} (${o.detail})`);
  return `${who} are all on ${s.topic}. Want to make a plan?\n${lines.join("\n")}\nReply 1, 2 or 3.`;
}

/**
 * The messages that gave the topic away, for the stage to pull into the
 * middle: the latest on-topic line from each of up to `max` people, in chat
 * order, with the matching words to highlight.
 */
export function evidenceFor(topic: Topic, messages: Message[], max = 3, window = WINDOW): Evidence[] {
  const recent = messages.filter((m) => !isBot(m)).slice(-window);
  const latest = new Map<string, Message>();
  for (const m of recent) if (topic.match.test(m.text)) latest.set(m.personId, m);
  return [...latest.values()]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, max)
    .sort((a, b) => a.ts - b.ts)
    .map((m) => ({ messageId: m.id, personId: m.personId, text: m.text, keyword: topic.match.exec(m.text)?.[0] ?? "" }));
}
