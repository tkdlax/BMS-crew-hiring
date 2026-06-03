/** Office-local date/time helpers (IANA timezone, e.g. America/Denver). */

export function getLocalParts(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) =>
    parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
  };
}

export function localTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimezoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
}

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const local = new Date(date.toLocaleString("en-US", { timeZone }));
  return local.getTime() - utc.getTime();
}

export function formatLocalDateKey(date: Date, timeZone: string): string {
  const p = getLocalParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function addLocalDays(dateStr: string, delta: number, timeZone: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = localTimeToUtc(y!, m!, d!, 12, 0, timeZone);
  utc.setUTCDate(utc.getUTCDate() + delta);
  return formatLocalDateKey(utc, timeZone);
}

export function getLocalDayOfWeek(dateStr: string, timeZone: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = localTimeToUtc(y!, m!, d!, 12, 0, timeZone);
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(utc);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

export function formatTimezoneLabel(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "long",
  }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
}
