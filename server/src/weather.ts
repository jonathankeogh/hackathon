import type { MeetTip, WeatherInfo } from "@deadlock/shared/types";
import { londonNow, londonToUtc, type LocalTime } from "./eventTime";
import { getJSON, type Fetcher } from "./http";

// Forecast for the venue at the event time. Open-Meteo by default (free, no
// key, 16 days ahead); OpenWeatherMap first when OPENWEATHER_API_KEY is set
// (5 days ahead, 3-hour steps). Null when neither answers, so the stage
// simply shows no forecast. Mock mode returns a fixed sample, marked as such.

const TIMEOUT_MS = Number(process.env.WEATHER_TIMEOUT_MS ?? 4000);

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

export const SAMPLE_WEATHER: WeatherInfo = {
  summary: "Light showers, 12°C, 60% chance of rain",
  tempC: 12,
  rainChance: 60,
  code: "rain",
  source: "sample",
};

interface Options {
  sample?: boolean;
  fetcher?: Fetcher;
}

export async function getWeather(place: Place, at: LocalTime | null, { sample = false, fetcher }: Options = {}): Promise<WeatherInfo | null> {
  if (sample) return SAMPLE_WEATHER;
  const when = at ?? londonNow();
  const key = process.env.OPENWEATHER_API_KEY?.trim();
  if (key) {
    const owm = await fromOpenWeather(place, when, key, fetcher);
    if (owm) return owm;
  }
  return fromOpenMeteo(place, when, fetcher);
}

// ───────────── Open-Meteo ─────────────

interface OpenMeteo {
  hourly?: { time: string[]; temperature_2m: number[]; precipitation_probability?: (number | null)[]; weather_code: number[] };
}

/** WMO weather code → our code and a plain description. */
export function wmo(code: number): [WeatherInfo["code"], string] {
  if (code === 0) return ["clear", "Clear"];
  if (code === 1) return ["clear", "Mostly clear"];
  if (code === 2) return ["cloud", "Partly cloudy"];
  if (code === 3) return ["cloud", "Overcast"];
  if (code === 45 || code === 48) return ["fog", "Fog"];
  if (code >= 51 && code <= 57) return ["drizzle", "Drizzle"];
  if (code >= 61 && code <= 67) return ["rain", code <= 61 ? "Light rain" : "Rain"];
  if (code >= 80 && code <= 82) return ["rain", code === 80 ? "Light showers" : "Showers"];
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ["snow", "Snow"];
  if (code >= 95) return ["storm", "Thunderstorms"];
  return ["cloud", "Cloudy"];
}

export async function fromOpenMeteo(place: Place, at: LocalTime, fetcher?: Fetcher): Promise<WeatherInfo | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
    `&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Europe%2FLondon` +
    `&start_date=${at.date}&end_date=${at.date}`;
  return parseOpenMeteo(await getJSON<OpenMeteo>(url, TIMEOUT_MS, fetcher), at);
}

export function parseOpenMeteo(body: OpenMeteo | null, at: LocalTime): WeatherInfo | null {
  const h = body?.hourly;
  if (!h?.time?.length) return null;
  const i = h.time.indexOf(`${at.date}T${at.time.slice(0, 2)}:00`);
  if (i < 0 || typeof h.temperature_2m[i] !== "number") return null;
  const [code, desc] = wmo(h.weather_code[i]);
  return describe(desc, h.temperature_2m[i], h.precipitation_probability?.[i] ?? null, code, "open-meteo");
}

// ───────────── OpenWeatherMap ─────────────

interface OwmForecast {
  list?: { dt: number; main: { temp: number }; pop?: number; weather: { id: number; description: string }[] }[];
}

function owmCode(id: number): WeatherInfo["code"] {
  if (id >= 200 && id < 300) return "storm";
  if (id >= 300 && id < 400) return "drizzle";
  if (id >= 500 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "fog";
  return id === 800 ? "clear" : "cloud";
}

export async function fromOpenWeather(place: Place, at: LocalTime, key: string, fetcher?: Fetcher): Promise<WeatherInfo | null> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${place.lat}&lon=${place.lon}&units=metric&appid=${encodeURIComponent(key)}`;
  return parseOpenWeather(await getJSON<OwmForecast>(url, TIMEOUT_MS, fetcher), at);
}

const SLOT_S = 3 * 3600;

export function parseOpenWeather(body: OwmForecast | null, at: LocalTime): WeatherInfo | null {
  if (!body?.list?.length) return null;
  const target = londonToUtc(at).getTime() / 1000;
  const slot = body.list.reduce((best, s) => (Math.abs(s.dt - target) < Math.abs(best.dt - target) ? s : best));
  // Beyond the 5-day window: let Open-Meteo answer instead.
  if (Math.abs(slot.dt - target) > SLOT_S) return null;
  const w = slot.weather[0];
  const desc = w?.description ?? "cloudy";
  return describe(desc, slot.main.temp, slot.pop === undefined ? null : Math.round(slot.pop * 100), owmCode(w?.id ?? 803), "openweathermap");
}

// ───────────── shared ─────────────

function describe(desc: string, temp: number, rain: number | null, code: WeatherInfo["code"], source: WeatherInfo["source"]): WeatherInfo {
  const t = Math.round(temp);
  const label = desc.charAt(0).toUpperCase() + desc.slice(1);
  return {
    summary: `${label}, ${t}°C${rain === null ? "" : `, ${rain}% chance of rain`}`,
    tempC: t,
    rainChance: rain,
    code,
    source,
  };
}

/** The forecast line, plus kit it implies: rain → umbrella, cold → layers, hot → sun cream. */
export function weatherTips(w: WeatherInfo): { forecast: MeetTip; kit: MeetTip[] } {
  const kit: MeetTip[] = [];
  const wet = w.code === "rain" || w.code === "drizzle" || w.code === "storm" || (w.rainChance ?? 0) >= 40;
  if (wet) kit.push({ kind: "bring", label: "Umbrella" }, { kind: "wear", label: "Waterproof jacket" });
  if (w.code === "snow" || w.tempC <= 8) kit.push({ kind: "wear", label: "Warm layers" });
  if (w.tempC >= 24 && !wet) kit.push({ kind: "bring", label: "Sun cream" }, { kind: "bring", label: "Water" });
  return { forecast: { kind: "weather", label: `Forecast: ${w.summary}` }, kit };
}
