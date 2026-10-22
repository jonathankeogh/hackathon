import type { LineStatus, TravelRoute } from "@deadlock/shared/types";
import type { LocalTime } from "./eventTime";
import { getJSON, type Fetcher } from "./http";
import type { AreaGuide } from "./meetTips";
import type { Place } from "./weather";

// Best ways in to the venue: from each side of London (north, east, south,
// west) and from the main nearby cities. Live routes come from the TfL
// Journey Planner (free; TFL_APP_KEY optional for higher limits). Cities
// take the mainline train to their London terminal, then TfL for the last
// leg. Anything TfL can't answer falls back to a distance-based estimate,
// marked `live: false`, so the demo never waits on it.

const TIMEOUT_MS = Number(process.env.TRAVEL_TIMEOUT_MS ?? 5000);

interface Origin extends Place {
  from: string;
}

/** A well-connected hub on each side of London. */
export const LONDON_ORIGINS: Origin[] = [
  { from: "North London", name: "Finsbury Park", lat: 51.5642, lon: -0.1065 },
  { from: "East London", name: "Stratford", lat: 51.5416, lon: -0.0034 },
  { from: "South London", name: "Brixton", lat: 51.4627, lon: -0.1145 },
  { from: "West London", name: "Hammersmith", lat: 51.4927, lon: -0.224 },
];

interface City extends Origin {
  /** Fastest typical mainline time to the terminal, minutes. */
  trainMinutes: number;
}

/** Nearby cities, arriving at their London terminal (name/lat/lon are the terminal). */
export const CITY_ORIGINS: City[] = [
  { from: "Brighton", name: "Victoria", lat: 51.4952, lon: -0.1441, trainMinutes: 60 },
  { from: "Cambridge", name: "King's Cross", lat: 51.5308, lon: -0.1238, trainMinutes: 50 },
  { from: "Oxford", name: "Paddington", lat: 51.5154, lon: -0.1755, trainMinutes: 60 },
  { from: "Reading", name: "Paddington", lat: 51.5154, lon: -0.1755, trainMinutes: 30 },
  { from: "Birmingham", name: "Euston", lat: 51.5282, lon: -0.1337, trainMinutes: 85 },
];

interface Options {
  offline?: boolean;
  fetcher?: Fetcher;
}

// ───────────── where is the venue ─────────────

interface GeoResults {
  results?: { name: string; latitude: number; longitude: number }[];
}

/**
 * The venue as a point: the area guide's main station when we know the area,
 * else Open-Meteo geocoding of the venue text ("Priya's office, Hoxton" →
 * tries "Hoxton", then the whole thing). Null when offline and unknown.
 */
export async function locate(area: AreaGuide | null, where: string, { offline = false, fetcher }: Options = {}): Promise<Place | null> {
  if (area) return { name: area.station, lat: area.lat, lon: area.lon };
  if (offline || !where.trim()) return null;
  const parts = where.split(",").map((p) => p.trim()).filter(Boolean).reverse();
  for (const q of [...parts, where.trim()].slice(0, 3)) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json&countryCode=GB`;
    const hit = (await getJSON<GeoResults>(url, TIMEOUT_MS, fetcher))?.results?.[0];
    if (hit) return { name: hit.name, lat: hit.latitude, lon: hit.longitude };
  }
  return null;
}

// ───────────── TfL Journey Planner ─────────────

interface TflJourneys {
  journeys?: {
    duration: number;
    legs: { duration: number; mode: { id: string }; instruction: { summary: string } }[];
  }[];
}

/** Fastest TfL journey → "Victoria line to Highbury & Islington, then Overground to Hoxton, then 4 min walk". */
export function summarizeJourney(body: TflJourneys | null): { summary: string; minutes: number } | null {
  const journeys = body?.journeys?.filter((j) => j.legs?.length);
  if (!journeys?.length) return null;
  const best = journeys.reduce((a, b) => (b.duration < a.duration ? b : a));
  const rides = best.legs.filter((l) => l.mode.id !== "walking").map((l) => l.instruction.summary.trim());
  const last = best.legs[best.legs.length - 1];
  const parts = rides.length ? rides : [`Walk`];
  if (rides.length && last.mode.id === "walking" && last.duration >= 3) parts.push(`${last.duration} min walk`);
  return { summary: parts.join(", then "), minutes: best.duration };
}

async function tfl(from: Place, to: Place, at: LocalTime | null, fetcher?: Fetcher) {
  const key = process.env.TFL_APP_KEY?.trim();
  const when = at ? `&date=${at.date.replace(/-/g, "")}&time=${at.time.replace(":", "")}&timeIs=Arriving` : "";
  const url =
    `https://api.tfl.gov.uk/Journey/JourneyResults/${from.lat},${from.lon}/to/${to.lat},${to.lon}` +
    `?journeyPreference=leasttime${when}${key ? `&app_key=${encodeURIComponent(key)}` : ""}`;
  return summarizeJourney(await getJSON<TflJourneys>(url, TIMEOUT_MS, fetcher));
}

// ───────────── offline estimate ─────────────

function km(a: Place, b: Place): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Rough door-to-door across London: ~18 km/h on the tube plus 10 min of walking and waiting, to the nearest 5. */
export function estimateMinutes(from: Place, to: Place): number {
  return Math.max(5, Math.round((km(from, to) / 18) * 60 / 5) * 5 + 10);
}

// ───────────── routes ─────────────

export async function getRoutes(dest: Place, at: LocalTime | null, { offline = false, fetcher }: Options = {}): Promise<TravelRoute[]> {
  const leg = (from: Place) => (offline ? Promise.resolve(null) : tfl(from, dest, at, fetcher));

  const london = LONDON_ORIGINS.map(async (o): Promise<TravelRoute> => {
    const live = await leg(o);
    if (live) return { from: o.from, group: "london", summary: live.summary, minutes: live.minutes, live: true };
    const n = estimateMinutes(o, dest);
    return { from: o.from, group: "london", summary: `From ${o.name}, tube or Overground to ${dest.name}, about ${n} min`, minutes: n, live: false };
  });
  const cities = CITY_ORIGINS.map(async (c): Promise<TravelRoute> => {
    const train = `Train to ${c.name}, about ${c.trainMinutes} min`;
    const live = await leg(c);
    if (live) return { from: c.from, group: "city", summary: `${train}, then ${lower(live.summary)}`, minutes: c.trainMinutes + live.minutes, live: true };
    const n = estimateMinutes(c, dest);
    return { from: c.from, group: "city", summary: `${train}, then about ${n} min to ${dest.name}`, minutes: c.trainMinutes + n, live: false };
  });

  return Promise.all([...london, ...cities]);
}

// ───────────── line status ─────────────

/** TfL line ids we can ask about. Overground lines have their own names since 2024. */
const TFL_LINES = new Set([
  "bakerloo", "central", "circle", "district", "hammersmith-city", "jubilee", "metropolitan", "northern", "piccadilly",
  "victoria", "waterloo-city", "elizabeth", "liberty", "lioness", "mildmay", "suffragette", "weaver", "windrush", "dlr",
]);

/** "Victoria line to Highbury & Islington, then Hammersmith & City line ..." → ["victoria", "hammersmith-city"]. */
export function linesIn(routes: TravelRoute[]): string[] {
  const ids = new Set<string>();
  for (const r of routes) {
    for (const m of r.summary.matchAll(/\b([a-z]+(?: & [a-z]+)?) line\b/gi)) {
      const id = m[1].toLowerCase().replace(" & ", "-");
      if (TFL_LINES.has(id)) ids.add(id);
    }
    if (/\bDLR\b/.test(r.summary)) ids.add("dlr");
  }
  return [...ids];
}

interface TflLine {
  id: string;
  name: string;
  lineStatuses?: { statusSeverity: number; statusSeverityDescription: string }[];
}

/** 10 is TfL's "Good Service"; anything else on any status entry is a disruption. */
export function parseLineStatus(body: TflLine[] | null): LineStatus[] {
  if (!Array.isArray(body)) return [];
  return body.map((l) => {
    const bad = (l.lineStatuses ?? []).filter((s) => s.statusSeverity !== 10);
    return {
      id: l.id,
      name: l.name,
      status: bad.length ? [...new Set(bad.map((s) => s.statusSeverityDescription))].join(", ") : "Good Service",
      good: bad.length === 0,
    };
  });
}

export async function getLineStatus(ids: string[], { offline = false, fetcher }: Options = {}): Promise<LineStatus[] | null> {
  if (offline || !ids.length) return [];
  const key = process.env.TFL_APP_KEY?.trim();
  const url = `https://api.tfl.gov.uk/Line/${ids.join(",")}/Status${key ? `?app_key=${encodeURIComponent(key)}` : ""}`;
  const body = await getJSON<TflLine[]>(url, TIMEOUT_MS, fetcher);
  return body ? parseLineStatus(body) : null;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
