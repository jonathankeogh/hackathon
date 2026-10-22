import type { LineStatus, TravelRoute, WeatherInfo } from "@deadlock/shared/types";

// What counts as a change worth a notification. Pure: compares the last
// answer with the new one and returns the line to send, or null. Small
// wobbles (1°C, a few minutes) stay quiet.

const RAIN_CHANCE = 40;
const TEMP_STEP = 3;
const ROUTE_STEP_MIN = 10;

const wet = (w: WeatherInfo) => w.code === "rain" || w.code === "drizzle" || w.code === "storm" || (w.rainChance ?? 0) >= RAIN_CHANCE;

export function weatherChange(prev: WeatherInfo | null | undefined, next: WeatherInfo): string | null {
  if (!prev) return null;
  const turned = wet(prev) !== wet(next) || (prev.code !== next.code && (next.code === "storm" || next.code === "snow"));
  const temp = Math.abs(prev.tempC - next.tempC) >= TEMP_STEP;
  if (!turned && !temp) return null;
  const advice =
    wet(next) && !wet(prev) ? " Bring an umbrella." :
    !wet(next) && wet(prev) ? " Looks dry now." :
    next.code === "snow" || (next.tempC <= 8 && prev.tempC > 8) ? " Wrap up warm." :
    next.tempC >= 24 && prev.tempC < 24 ? " Bring water and sun cream." : "";
  return `Weather update: ${next.summary} (was ${prev.summary}).${advice}`;
}

/** Live routes that got 10+ minutes slower or faster since last time. */
export function routeChanges(prev: TravelRoute[] | null | undefined, next: TravelRoute[]): string[] {
  if (!prev?.length) return [];
  const out: string[] = [];
  for (const r of next) {
    const p = prev.find((x) => x.from === r.from);
    if (!p?.live || !r.live || p.minutes === null || r.minutes === null) continue;
    if (Math.abs(r.minutes - p.minutes) < ROUTE_STEP_MIN) continue;
    out.push(`from ${r.from} now ${r.minutes} min (was ${p.minutes}): ${r.summary}`);
  }
  return out;
}

/** Lines that went from good service to disrupted, or recovered. */
export function lineChanges(prev: LineStatus[] | null | undefined, next: LineStatus[]): string[] {
  if (!prev?.length) return [];
  const out: string[] = [];
  for (const l of next) {
    const p = prev.find((x) => x.id === l.id);
    if (!p || (p.good === l.good && p.status === l.status)) continue;
    out.push(l.good ? `${l.name} line back to good service` : `${l.name} line: ${l.status}`);
  }
  return out;
}

export function travelChange(parts: string[]): string | null {
  return parts.length ? `Travel update: ${parts.join("; ")}.` : null;
}
