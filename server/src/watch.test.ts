import { describe, expect, it } from "vitest";
import type { LineStatus, TravelRoute, WeatherInfo } from "@deadlock/shared/types";
import { lineChanges, routeChanges, travelChange, weatherChange } from "./watch";
import { linesIn, parseLineStatus } from "./travel";

const w = (o: Partial<WeatherInfo>): WeatherInfo => ({ summary: "Cloudy, 13°C, 20% chance of rain", tempC: 13, rainChance: 20, code: "cloud", source: "open-meteo", ...o });
const route = (from: string, minutes: number, live = true, summary = "Northern line to Old Street"): TravelRoute => ({ from, group: "london", summary, minutes, live });
const line = (id: string, good: boolean, status = good ? "Good Service" : "Minor Delays"): LineStatus => ({ id, name: id[0].toUpperCase() + id.slice(1), status, good });

describe("weatherChange", () => {
  it("is quiet on the first answer and on small wobbles", () => {
    expect(weatherChange(null, w({}))).toBeNull();
    expect(weatherChange(w({}), w({ tempC: 14, rainChance: 30 }))).toBeNull();
  });
  it("speaks up when rain arrives or clears", () => {
    const rain = w({ summary: "Rain, 11°C, 80% chance of rain", tempC: 11, rainChance: 80, code: "rain" });
    expect(weatherChange(w({}), rain)).toBe("Weather update: Rain, 11°C, 80% chance of rain (was Cloudy, 13°C, 20% chance of rain). Bring an umbrella.");
    expect(weatherChange(rain, w({}))).toMatch(/Looks dry now\.$/);
  });
  it("speaks up on a big temperature swing", () => {
    expect(weatherChange(w({}), w({ summary: "Cloudy, 7°C", tempC: 7 }))).toMatch(/Wrap up warm\.$/);
  });
});

describe("travel changes", () => {
  it("flags live routes 10+ minutes slower, ignores estimates and small changes", () => {
    const prev = [route("North London", 25), route("West London", 40), route("Brighton", 85, false)];
    const next = [route("North London", 29), route("West London", 55), route("Brighton", 120, false)];
    expect(routeChanges(prev, next)).toEqual(["from West London now 55 min (was 40): Northern line to Old Street"]);
    expect(routeChanges(null, next)).toEqual([]);
  });
  it("flags lines going down and recovering", () => {
    expect(lineChanges([line("northern", true), line("victoria", false)], [line("northern", false, "Severe Delays"), line("victoria", true)])).toEqual([
      "Northern line: Severe Delays",
      "Victoria line back to good service",
    ]);
    expect(lineChanges(undefined, [line("northern", false)])).toEqual([]);
  });
  it("joins parts into one notice", () => {
    expect(travelChange([])).toBeNull();
    expect(travelChange(["Northern line: Severe Delays", "from West London now 55 min (was 40)"])).toBe(
      "Travel update: Northern line: Severe Delays; from West London now 55 min (was 40).",
    );
  });
});

describe("TfL lines", () => {
  it("finds the lines a route uses", () => {
    expect(
      linesIn([
        route("North London", 25, true, "Victoria line to Highbury & Islington, then Mildmay line to Dalston"),
        route("Cambridge", 70, true, "Train to King's Cross, then hammersmith & city line to Farringdon"),
        route("East London", 20, true, "DLR to Bank, then walk"),
        route("West London", 40, true, "Bus 73 to Old Street, then 2 min walk"),
      ]),
    ).toEqual(["victoria", "mildmay", "hammersmith-city", "dlr"]);
  });
  it("reads TfL's status response", () => {
    expect(
      parseLineStatus([
        { id: "northern", name: "Northern", lineStatuses: [{ statusSeverity: 10, statusSeverityDescription: "Good Service" }] },
        { id: "victoria", name: "Victoria", lineStatuses: [{ statusSeverity: 6, statusSeverityDescription: "Severe Delays" }] },
      ]),
    ).toEqual([
      { id: "northern", name: "Northern", status: "Good Service", good: true },
      { id: "victoria", name: "Victoria", status: "Severe Delays", good: false },
    ]);
    expect(parseLineStatus(null)).toEqual([]);
  });
});
