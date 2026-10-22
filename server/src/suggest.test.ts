import { describe, expect, it } from "vitest";
import type { Message } from "@deadlock/shared/types";
import { AREAS } from "./meetTips";
import { buildOptions, findQuorum, parseVote, suggestionText, TOPICS } from "./suggest";
import { londonLabel, parseFixtures, pickFixture } from "./fixtures";
import { seedMessages, seedMessagesFor } from "./seed";

let n = 0;
const msg = (personId: string, text: string): Message => ({ id: `t${++n}`, personId, text, ts: n });
const football = TOPICS.find((t) => t.key === "football")!;
const shoreditch = AREAS.find((a) => a.name === "Shoreditch")!;
const camden = AREAS.find((a) => a.name === "Camden")!;

describe("findQuorum", () => {
  it("finds football in the sports seed, with the teams named", () => {
    const q = findQuorum(seedMessagesFor("sports"))!;
    expect(q.topic.key).toBe("football");
    expect(q.people).toHaveLength(6);
    expect(q.teams).toEqual(["Arsenal", "Tottenham"]);
  });

  it("needs three different people, not three messages", () => {
    const one = [msg("a", "arsenal!"), msg("a", "come on arsenal"), msg("b", "the premier league is back")];
    expect(findQuorum(one)).toBeNull();
    expect(findQuorum([...one, msg("c", "footy on saturday?")])?.people).toEqual(["a", "b", "c"]);
  });

  it("stays quiet on the workshop chat, and skips topics already offered", () => {
    expect(findQuorum(seedMessages())).toBeNull();
    expect(findQuorum(seedMessagesFor("sports"), { skip: new Set(["football"]) })).toBeNull();
  });

  it("only looks at the recent window and ignores the bot", () => {
    const old = [msg("a", "f1 this weekend"), msg("b", "grand prix!"), msg("c", "verstappen again")];
    const filler = Array.from({ length: 20 }, (_, i) => msg("z", `chat ${i}`));
    expect(findQuorum([...old, ...filler])).toBeNull();
    expect(findQuorum([msg("a", "football"), msg("b", "football"), msg("bot", "🤖 football")])).toBeNull();
  });
});

describe("buildOptions", () => {
  const fixture = { title: "Arsenal v Tottenham", home: "Arsenal", away: "Tottenham", startsAt: new Date("2026-10-24T16:30:00Z"), venue: "Emirates Stadium" };

  it("live: the real fixture, a bar that shows it, something in the area", () => {
    const [live, venue, area] = buildOptions(football, { area: shoreditch, fixture, teams: ["Arsenal"] });
    expect(live).toMatchObject({ id: "live", title: "Arsenal v Tottenham", detail: "Sat 24 Oct, 17:30, Premier League", when: "Sat 24 Oct, 17:30" });
    expect(venue).toMatchObject({ id: "venue", title: "Boxpark Shoreditch", plan: "Match at Boxpark Shoreditch", where: "Boxpark Shoreditch" });
    expect(area).toMatchObject({ id: "area", title: "Five-a-side near Old Street", detail: "Then curry or a salt beef bagel on Brick Lane" });
  });

  it("never invents a fixture: names the team, or no team, with no time", () => {
    const [team] = buildOptions(football, { area: camden, fixture: null, teams: ["Arsenal"] });
    expect(team).toMatchObject({ title: "Arsenal's next match", plan: "Arsenal's next match", when: undefined });
    const [none, venue] = buildOptions(football, { area: camden, fixture: null, teams: [] });
    expect(none.title).toBe("The next Premier League game");
    expect(venue.title).toBe("A sports pub near Camden Town");
  });

  it("keeps every plan title within the 30-cell board", () => {
    for (const topic of TOPICS) for (const area of [shoreditch, camden, null]) {
      for (const o of buildOptions(topic, { area, fixture: null, teams: ["Arsenal"] })) expect(o.plan.length, `${topic.key}: ${o.plan}`).toBeLessThanOrEqual(30);
    }
  });

  it("non-sport topics use the area guide for the third option", () => {
    const gigs = TOPICS.find((t) => t.key === "gigs")!;
    const [, , area] = buildOptions(gigs, { area: camden, fixture: null, teams: [] });
    expect(area.title).toBe(camden.nearby[0]);
  });
});

describe("parseVote", () => {
  it("reads numbers and words", () => {
    expect(parseVote("1")).toBe("live");
    expect(parseVote("2!")).toBe("venue");
    expect(parseVote("option 3 please")).toBe("area");
    expect(parseVote("number two")).toBe("venue");
    expect(parseVote("the first one")).toBe("live");
  });
  it("ignores normal chat with numbers in it", () => {
    expect(parseVote("I've had 2 pints")).toBeNull();
    expect(parseVote("12 of us said yes")).toBeNull();
    expect(parseVote("3pm works")).toBeNull();
  });
});

describe("fixtures", () => {
  it("reads TheSportsDB and prefers a match with a team the chat named", () => {
    const list = parseFixtures({
      events: [
        { strEvent: "Chelsea vs Everton", strHomeTeam: "Chelsea", strAwayTeam: "Everton", strTimestamp: "2026-10-24T11:30:00" },
        { strEvent: "Arsenal vs Tottenham", strHomeTeam: "Arsenal", strAwayTeam: "Tottenham", strTimestamp: "2026-10-25T16:30:00+00:00" },
        { strEvent: "Old game", strHomeTeam: "A", strAwayTeam: "B", strTimestamp: "2026-10-01T16:30:00" },
      ],
    });
    const now = new Date("2026-10-22T12:00:00Z");
    expect(pickFixture(list, ["Tottenham"], now)?.title).toBe("Arsenal v Tottenham");
    expect(pickFixture(list, [], now)?.title).toBe("Chelsea v Everton");
    expect(parseFixtures(null)).toEqual([]);
  });
  it("labels times in London time", () => {
    expect(londonLabel(new Date("2026-10-24T11:30:00Z"))).toBe("Sat 24 Oct, 12:30");
    expect(londonLabel(new Date("2026-11-07T15:00:00Z"))).toBe("Sat 7 Nov, 15:00");
  });
});

describe("suggestionText", () => {
  it("names who's talking and numbers the options", () => {
    const options = buildOptions(football, { area: shoreditch, fixture: null, teams: ["Arsenal"] });
    expect(suggestionText({ topic: "Premier League", options }, ["Maya", "Tom", "Sam", "Dan", "Leah"])).toBe(
      "Maya, Tom, Sam and 2 more are all on Premier League. Want to make a plan?\n" +
        "1. Arsenal's next match (Premier League, kick-off to confirm)\n" +
        "2. Boxpark Shoreditch (Big screens for the big games, street food)\n" +
        "3. Five-a-side near Old Street (Then curry or a salt beef bagel on Brick Lane)\n" +
        "Reply 1, 2 or 3.",
    );
  });
});
