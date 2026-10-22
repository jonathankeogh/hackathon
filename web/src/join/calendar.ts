import type { EventDetails } from "@deadlock/shared/types";

// A one-event calendar file for "Add to calendar". Two hours long unless we
// know better; times in UTC so every calendar app agrees.

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

export function icsFor(event: EventDetails, now = new Date()): string | null {
  if (!event.startsAt) return null;
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 2 * 3600_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Deadlock//Plan//EN",
    "BEGIN:VEVENT",
    `UID:${stamp(start)}-${event.title.replace(/\W+/g, "").slice(0, 24)}@deadlock`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(event.title)}`,
    `LOCATION:${esc(event.where)}`,
    `DESCRIPTION:${esc([event.blurb, ...event.agenda].join("\n"))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Hands the phone the file; iOS and Android offer to add it to the calendar. */
export function downloadIcs(event: EventDetails) {
  const ics = icsFor(event);
  if (!ics) return;
  const a = document.createElement("a");
  a.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  a.download = `${event.title.replace(/[^\w\s-]/g, "").trim() || "plan"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
