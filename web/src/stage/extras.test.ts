import { describe, expect, it } from "vitest";
import type { Milestone, Poll } from "@deadlock/shared/types";
import { countdown } from "./right/Departs";
import { manifestRows } from "./right/Manifest";
import { brokenIn } from "./track/Recap";
import { icsFor } from "../join/calendar";

describe("countdown", () => {
  const now = Date.parse("2026-10-22T12:00:00Z");
  it("days, then a clock, then departing", () => {
    expect(countdown("2026-10-24T16:30:05Z", now)).toBe("2D 04:30:05");
    expect(countdown("2026-10-22T13:05:00Z", now)).toBe("01:05:00");
    expect(countdown("2026-10-22T11:00:00Z", now)).toBe("DEPARTING");
  });
});

describe("manifestRows", () => {
  it("confirmed, guests, maybes, then what the yeses bring, most first; empty rows dropped", () => {
    const poll: Poll = {
      bringOptions: [],
      answers: [
        { personId: "a", going: "yes", bring: ["Snacks", "Cards"], guests: 2 },
        { personId: "b", going: "yes", bring: ["Snacks"], guests: 0 },
        { personId: "c", going: "maybe", bring: ["Pizza"], guests: 0 },
        { personId: "d", going: "yes", bring: ["Just me"], guests: 0 },
      ],
    };
    expect(manifestRows(poll)).toEqual([["Confirmed", 3], ["Guests", 2], ["Maybe", 1], ["Snacks", 2], ["Cards", 1]]);
    expect(manifestRows({ bringOptions: [], answers: [] })).toEqual([]);
  });
});

describe("brokenIn", () => {
  const m = (key: Milestone["key"], ts: number): Milestone => ({ key, label: key, ts });
  it("first milestone to booked, as m:ss", () => {
    expect(brokenIn([m("spotted", 0), m("plan", 60_000), m("booked", 134_000)])).toBe("DEADLOCK BROKEN IN 2:14");
    expect(brokenIn([m("spotted", 0), m("plan", 1000)])).toBeNull();
  });
});

describe("icsFor", () => {
  it("a two-hour event in UTC, with escaped text", () => {
    const ics = icsFor(
      { title: "Match at Boxpark, Shoreditch", when: "Sat 24 Oct, 17:30", where: "Boxpark; Shoreditch", agenda: ["Kick-off"], blurb: "Big screens", startsAt: "2026-10-24T16:30:00.000Z" },
      new Date("2026-10-22T12:00:00Z"),
    )!;
    expect(ics).toContain("DTSTART:20261024T163000Z");
    expect(ics).toContain("DTEND:20261024T183000Z");
    expect(ics).toContain("SUMMARY:Match at Boxpark\\, Shoreditch");
    expect(ics).toContain("LOCATION:Boxpark\\; Shoreditch");
    expect(icsFor({ title: "x", when: "soon", where: "", agenda: [], blurb: "" })).toBeNull();
  });
});
