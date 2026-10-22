// The event's "when" ("Thu 29 Oct, 18:30") as London local date and time,
// for asking weather and journey APIs about the right moment.

export interface LocalTime {
  date: string; // "2026-10-29", Europe/London
  time: string; // "18:30"
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
const DEFAULT_TIME = "18:30";

const pad = (n: number) => String(n).padStart(2, "0");

/** London wall-clock parts of an instant. */
function londonParts(at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, Number(p.value)]),
  );
  return { y: parts.year, m: parts.month, d: parts.day, hh: parts.hour, mm: parts.minute };
}

export function londonNow(now = new Date()): LocalTime {
  const p = londonParts(now);
  return { date: `${p.y}-${pad(p.m)}-${pad(p.d)}`, time: `${pad(p.hh)}:${pad(p.mm)}` };
}

/** London local date + time → the real instant (handles BST/GMT). */
export function londonToUtc({ date, time }: LocalTime): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const p = londonParts(new Date(guess));
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm) - guess;
  return new Date(guess - offset);
}

function parseTime(t: string): string {
  const hm = /\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\b/.exec(t);
  if (hm) {
    let h = Number(hm[1]) % 24;
    if (hm[3] === "pm" && h < 12) h += 12;
    if (hm[3] === "am" && h === 12) h = 0;
    return `${pad(h)}:${hm[2]}`;
  }
  const ap = /\b(\d{1,2})\s*(am|pm)\b/.exec(t);
  if (ap) return `${pad((Number(ap[1]) % 12) + (ap[2] === "pm" ? 12 : 0))}:00`;
  return DEFAULT_TIME;
}

/**
 * "Thu 29 Oct, 18:30", "Oct 29 6pm", "Saturday 10am", "tomorrow" → London
 * local date and time. Dates already past roll to next year. Null when no
 * day can be found.
 */
export function parseWhen(when: string, now = new Date()): LocalTime | null {
  const t = when.toLowerCase();
  const today = londonParts(now);
  const todayUtc = Date.UTC(today.y, today.m - 1, today.d);
  let day: Date | null = null;

  const dm = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}`).exec(t);
  const md = new RegExp(`\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`).exec(t);
  if (dm || md) {
    const d = Number(dm ? dm[1] : md![2]);
    const m = MONTHS.indexOf(dm ? dm[2] : md![1]);
    let y = today.y;
    if (Date.UTC(y, m, d) < todayUtc) y++;
    day = new Date(Date.UTC(y, m, d));
  } else if (/\b(today|tonight)\b/.test(t)) {
    day = new Date(todayUtc);
  } else if (/\btomorrow\b/.test(t)) {
    day = new Date(todayUtc + 86_400_000);
  } else {
    const wd = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues?|wed|thu(?:rs?)?|fri|sat)\b/.exec(t);
    if (!wd) return null;
    const ahead = (DAYS.indexOf(wd[1].slice(0, 3)) - new Date(todayUtc).getUTCDay() + 7) % 7;
    day = new Date(todayUtc + ahead * 86_400_000);
  }
  if (Number.isNaN(day.getTime())) return null;
  return { date: day.toISOString().slice(0, 10), time: parseTime(t) };
}
