import { describe, expect, it } from "vitest";
import type { Fetcher } from "./http";
import { getJSON } from "./http";
import { londonToUtc, parseWhen } from "./eventTime";
import { AREAS } from "./meetTips";
import { CITY_ORIGINS, LONDON_ORIGINS, estimateMinutes, getRoutes, locate, summarizeJourney } from "./travel";
import { SAMPLE_WEATHER, getWeather, parseOpenMeteo, parseOpenWeather, weatherTips } from "./weather";

// Weather + travel against fixture API responses: no network.

const NOW = new Date("2026-10-22T12:00:00Z"); // a Thursday
const shoreditch = AREAS.find((a) => a.name === "Shoreditch")!;
const venue = { name: "Old Street", lat: shoreditch.lat, lon: shoreditch.lon };

/** A fetch that answers by URL substring, and records what was asked. */
function fakeFetch(routes: Record<string, unknown>, calls: string[] = []): Fetcher {
  return async (url) => {
    calls.push(String(url));
    const hit = Object.entries(routes).find(([k]) => String(url).includes(k));
    if (!hit) return new Response("nope", { status: 403 });
    return new Response(JSON.stringify(hit[1]), { status: 200, headers: { "content-type": "application/json" } });
  };
}

describe("parseWhen", () => {
  it("reads Grok's booking format as London local time", () => {
    expect(parseWhen("Thu 29 Oct, 18:30", NOW)).toEqual({ date: "2026-10-29", time: "18:30" });
    expect(parseWhen("October 31st at 7pm", NOW)).toEqual({ date: "2026-10-31", time: "19:00" });
  });
  it("rolls past dates to next year and reads day names", () => {
    expect(parseWhen("3 Jan 10am", NOW)?.date).toBe("2027-01-03");
    expect(parseWhen("Saturday 10:00", NOW)).toEqual({ date: "2026-10-24", time: "10:00" });
    expect(parseWhen("tomorrow", NOW)).toEqual({ date: "2026-10-23", time: "18:30" });
    expect(parseWhen("soon", NOW)).toBeNull();
  });
  it("converts London time to UTC across BST and GMT", () => {
    expect(londonToUtc({ date: "2026-07-01", time: "18:30" }).toISOString()).toBe("2026-07-01T17:30:00.000Z");
    expect(londonToUtc({ date: "2026-12-01", time: "18:30" }).toISOString()).toBe("2026-12-01T18:30:00.000Z");
  });
});

describe("weather", () => {
  const at = { date: "2026-10-29", time: "18:30" };
  const meteo = {
    hourly: {
      time: ["2026-10-29T17:00", "2026-10-29T18:00", "2026-10-29T19:00"],
      temperature_2m: [12.4, 11.6, 10.9],
      precipitation_probability: [40, 65, 70],
      weather_code: [3, 61, 63],
    },
  };

  it("picks the event hour from Open-Meteo", () => {
    expect(parseOpenMeteo(meteo, at)).toEqual({
      summary: "Light rain, 12°C, 65% chance of rain",
      tempC: 12,
      rainChance: 65,
      code: "rain",
      source: "open-meteo",
    });
    expect(parseOpenMeteo(meteo, { date: "2026-10-30", time: "18:00" })).toBeNull();
    expect(parseOpenMeteo(null, at)).toBeNull();
  });

  it("picks the nearest 3-hour slot from OpenWeatherMap, and nothing past its range", () => {
    const t = londonToUtc(at).getTime() / 1000;
    const owm = {
      list: [
        { dt: t - 3 * 3600, main: { temp: 14 }, pop: 0.1, weather: [{ id: 801, description: "few clouds" }] },
        { dt: t + 1800, main: { temp: 9.6 }, pop: 0.8, weather: [{ id: 500, description: "light rain" }] },
      ],
    };
    expect(parseOpenWeather(owm, at)).toMatchObject({ summary: "Light rain, 10°C, 80% chance of rain", code: "rain", source: "openweathermap" });
    expect(parseOpenWeather(owm, { date: "2026-11-05", time: "18:30" })).toBeNull();
  });

  it("asks Open-Meteo for the venue and the day, and returns null when it fails", async () => {
    const calls: string[] = [];
    const w = await getWeather(venue, at, { fetcher: fakeFetch({ "api.open-meteo.com": meteo }, calls) });
    expect(w?.source).toBe("open-meteo");
    expect(calls[0]).toContain(`latitude=${venue.lat}`);
    expect(calls[0]).toContain("start_date=2026-10-29");
    expect(await getWeather(venue, at, { fetcher: fakeFetch({}) })).toBeNull();
  });

  it("returns the sample, without a network call, in mock mode", async () => {
    const calls: string[] = [];
    expect(await getWeather(venue, at, { sample: true, fetcher: fakeFetch({}, calls) })).toBe(SAMPLE_WEATHER);
    expect(calls).toEqual([]);
  });

  it("turns the forecast into kit", () => {
    const kit = (w: Partial<typeof SAMPLE_WEATHER>) => weatherTips({ ...SAMPLE_WEATHER, ...w }).kit.map((t) => t.label);
    expect(kit({})).toEqual(["Umbrella", "Waterproof jacket"]);
    expect(kit({ code: "clear", rainChance: 0, tempC: 27 })).toEqual(["Sun cream", "Water"]);
    expect(kit({ code: "cloud", rainChance: 10, tempC: 4 })).toEqual(["Warm layers"]);
    expect(weatherTips(SAMPLE_WEATHER).forecast).toEqual({ kind: "weather", label: `Forecast: ${SAMPLE_WEATHER.summary}` });
  });
});

describe("travel", () => {
  const tflBody = {
    journeys: [
      {
        duration: 31,
        legs: [
          { duration: 3, mode: { id: "walking" }, instruction: { summary: "Walk to Finsbury Park" } },
          { duration: 22, mode: { id: "tube" }, instruction: { summary: "Victoria line to Highbury & Islington" } },
          { duration: 6, mode: { id: "walking" }, instruction: { summary: "Walk to Old Street" } },
        ],
      },
      { duration: 24, legs: [{ duration: 20, mode: { id: "tube" }, instruction: { summary: "Northern line to Old Street" } }, { duration: 4, mode: { id: "walking" }, instruction: { summary: "Walk" } }] },
    ],
  };

  it("summarises the fastest TfL journey", () => {
    expect(summarizeJourney(tflBody)).toEqual({ summary: "Northern line to Old Street, then 4 min walk", minutes: 24 });
    expect(summarizeJourney({ journeys: [] })).toBeNull();
    expect(summarizeJourney(null)).toBeNull();
  });

  it("routes in from all four sides of London and the nearby cities", async () => {
    const calls: string[] = [];
    const routes = await getRoutes(venue, { date: "2026-10-29", time: "18:30" }, { fetcher: fakeFetch({ "api.tfl.gov.uk": tflBody }, calls) });
    expect(routes.map((r) => r.from)).toEqual([...LONDON_ORIGINS.map((o) => o.from), ...CITY_ORIGINS.map((c) => c.from)]);
    expect(routes.every((r) => r.live)).toBe(true);
    expect(calls[0]).toContain("date=20261029&time=1830&timeIs=Arriving");
    const cambridge = routes.find((r) => r.from === "Cambridge")!;
    expect(cambridge).toMatchObject({ group: "city", summary: "Train to King's Cross, about 50 min, then northern line to Old Street, then 4 min walk", minutes: 74 });
  });

  it("falls back to estimates when TfL is down, and makes no calls offline", async () => {
    const down = await getRoutes(venue, null, { fetcher: fakeFetch({}) });
    expect(down.every((r) => !r.live && r.minutes! > 0)).toBe(true);
    expect(down[0].summary).toMatch(/^From Finsbury Park, tube or Overground to Old Street, about \d+ min$/);
    const calls: string[] = [];
    await getRoutes(venue, null, { offline: true, fetcher: fakeFetch({ "api.tfl.gov.uk": tflBody }, calls) });
    expect(calls).toEqual([]);
  });

  it("estimates sensible cross-London times", () => {
    const [north, east, south, west] = LONDON_ORIGINS.map((o) => estimateMinutes(o, venue));
    for (const m of [north, east, south, west]) expect(m).toBeGreaterThanOrEqual(15);
    expect(west).toBeGreaterThan(north); // Hammersmith is further from Old Street than Finsbury Park
  });

  it("locates the venue from the area guide, or geocodes it", async () => {
    expect(await locate(shoreditch, "anything", { offline: true })).toEqual(venue);
    const geo = fakeFetch({ "name=Tooting": { results: [{ name: "Tooting", latitude: 51.42, longitude: -0.17 }] } });
    expect(await locate(null, "Jo's flat, Tooting", { fetcher: geo })).toEqual({ name: "Tooting", lat: 51.42, lon: -0.17 });
    expect(await locate(null, "Tooting", { offline: true })).toBeNull();
  });
});

describe("getJSON", () => {
  it("gives up after the timeout", async () => {
    const hang: Fetcher = (_url, init) =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    expect(await getJSON("https://example.test", 20, hang)).toBeNull();
  });
});
