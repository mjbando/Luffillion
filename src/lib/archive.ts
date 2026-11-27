// Archive replays: past daily voyages a captain can still play. Pure helpers, safe for the browser.

/** The first daily voyage that can be replayed: launch day. */
export const ARCHIVE_FIRST_DAY = "2026-11-23";
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Today's daily key (Eastern time, same as the server's todayKey). */
export function easternDayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** A past day (before today, not before the first archive day) that can be replayed. */
export function isArchiveDay(day: unknown, now: Date = new Date()): day is string {
  if (typeof day !== "string" || !DAY.test(day)) return false;
  const parsed = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) return false;
  return day >= ARCHIVE_FIRST_DAY && day < easternDayKey(now);
}

/** Every replayable day, newest first. */
export function archiveDays(now: Date = new Date()): string[] {
  const days: string[] = [];
  const today = easternDayKey(now);
  const d = new Date(`${today}T12:00:00Z`);
  for (let i = 0; i < 3660; i++) {
    d.setUTCDate(d.getUTCDate() - 1);
    const key = d.toISOString().slice(0, 10);
    if (key < ARCHIVE_FIRST_DAY) break;
    days.push(key);
  }
  return days;
}
