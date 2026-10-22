import { describe, expect, it } from "vitest";
import type { Message } from "@deadlock/shared/types";
import { findArea, meetExtras, parseMessage } from "./meetTips";
import { seedMessages } from "./seed";

let n = 0;
const msg = (text: string, personId = "p1"): Message => ({ id: `m${++n}`, personId, text, ts: n });
const labels = (text: string, kind: string) => parseMessage(msg(text)).filter((t) => t.kind === kind).map((t) => t.label);

describe("parseMessage", () => {
  it("finds what to bring, with the sentence it came from", () => {
    const [tip] = parseMessage(msg("count me in, I'll bring my laptop", "p-leah"));
    expect(tip).toEqual({ kind: "bring", label: "Laptop", personId: "p-leah", quote: "count me in, I'll bring my laptop" });
    expect(labels("don't forget your charger and some water", "bring")).toEqual(["Charger", "Water"]);
  });

  it("ignores offers that aren't kit", () => {
    expect(parseMessage(msg("I'll bring pizza if there's a venue"))).toEqual([]);
    expect(parseMessage(msg("our office has a room for 40. I can host if 15+ people actually commit"))).toEqual([]);
  });

  it("finds what to wear", () => {
    expect(labels("wear sportswear and trainers", "wear")).toEqual(["Sportswear", "Trainers"]);
    expect(labels("bring trainers, the pitch is astro", "wear")).toEqual(["Trainers"]);
    // "smart" alone is not a dress code
    expect(labels("that's a smart idea", "wear")).toEqual([]);
  });

  it("finds travel, meeting point, weather and after-plans", () => {
    expect(labels("Northern line to Old Street, then 5 mins walk", "travel")).toHaveLength(1);
    expect(labels("meet outside the main entrance at 6:15", "meetingPoint")).toEqual(["meet outside the main entrance at 6:15"]);
    expect(labels("forecast says rain on Thursday", "weather")).toHaveLength(1);
    expect(labels("pub after?", "activity")).toEqual(["pub after?"]);
    expect(labels("we could hit the pub after", "activity")).toEqual(["we could hit the pub after"]);
  });

  it("does not read the sport as kit", () => {
    expect(labels("need a proper screen and a pint for the football", "bring")).toEqual([]);
    expect(labels("bring a ball for after", "bring")).toEqual(["A ball"]);
  });

  it("does not read Waterloo as water", () => {
    expect(labels("I'll bring stuff from Waterloo", "bring")).toEqual([]);
  });

  it("skips the bot's own posts", () => {
    expect(parseMessage(msg("🤖 *Deadlock bot*\nBring: laptop."))).toEqual([]);
  });
});

describe("findArea", () => {
  it("maps stations and streets to an area", () => {
    expect(findArea(["near Old Street roundabout"])?.name).toBe("Shoreditch");
    expect(findArea(["Granary Square"])?.name).toBe("King's Cross");
    expect(findArea(["somewhere nice"])).toBeNull();
  });
  it("prefers the first text given", () => {
    expect(findArea(["Priya's office, Camden", "Shoreditch"])?.name).toBe("Camden");
  });
});

describe("meetExtras", () => {
  it("reads the seeded chat: Shoreditch, laptop, travel from the guide", () => {
    const x = meetExtras({ messages: seedMessages(), planTitle: "Hands-on Grok agents workshop", where: "Priya's office, Shoreditch" });
    expect(x.area).toBe("Shoreditch");
    expect(x.tips.filter((t) => t.kind === "bring").map((t) => t.label)).toEqual(["Laptop", "Charger"]);
    // Laptop came from Leah's message, so it keeps her quote over the inferred one.
    expect(x.tips.find((t) => t.label === "Laptop")?.personId).toBe("p-leah");
    expect(x.tips[0]).toEqual({ kind: "travel", label: expect.stringMatching(/^Nearest: Old Street/) });
    expect(x.nearby.length).toBeGreaterThanOrEqual(3);
  });

  it("turns rain into an umbrella and sport into sportswear", () => {
    const x = meetExtras({ messages: [msg("looks like rain on Sunday")], planTitle: "Sunday five-a-side" });
    const got = x.tips.map((t) => `${t.kind}:${t.label}`);
    expect(got).toContain("bring:Umbrella");
    expect(got).toContain("wear:Sportswear");
    expect(got).toContain("wear:Trainers");
  });

  it("puts chat ideas ahead of the area guide", () => {
    const x = meetExtras({ messages: [msg("we should grab ramen after at Kanada-Ya")], where: "Granary Square, King's Cross" });
    expect(x.nearby[0]).toBe("we should grab ramen after at Kanada-Ya");
    expect(x.nearby).toContain("Shops and food at Coal Drops Yard");
  });

  it("keeps a chat travel tip instead of the guide's", () => {
    const x = meetExtras({ messages: [msg("get off at Hoxton overground, 2 mins walk")], where: "Shoreditch" });
    expect(x.tips.filter((t) => t.kind === "travel")).toEqual([
      expect.objectContaining({ label: "get off at Hoxton overground, 2 mins walk", personId: "p1" }),
    ]);
  });

  it("returns nothing nearby for an unknown area", () => {
    expect(meetExtras({ messages: [], where: "the moon" })).toEqual({ area: null, tips: [], nearby: [] });
  });
});
