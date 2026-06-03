import {
  addLocalDays,
  formatLocalDateKey,
  getLocalDayOfWeek,
  localTimeToUtc,
} from "./timezone.js";

export interface AvailabilityRule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface BookedInterval {
  startsAt: Date;
  endsAt: Date;
}

export interface SlotResult {
  startsAt: string;
  endsAt: string;
  /** Office-local calendar date (YYYY-MM-DD). */
  localDate: string;
  /** Time only in office timezone, e.g. "10:00 AM MT". */
  labelTime: string;
  /** @deprecated Prefer labelTime — full datetime string in office TZ. */
  labelLocal: string;
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h! * 60 + m!;
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60 * 1000);
}

function formatTimeOnly(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatLocal(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function iterateLocalDates(
  fromDate: string,
  toDate: string,
  timeZone: string
): string[] {
  const dates: string[] = [];
  let cursor = fromDate;
  while (cursor <= toDate) {
    dates.push(cursor);
    cursor = addLocalDays(cursor, 1, timeZone);
  }
  return dates;
}

export function generateSlots(
  fromDate: string,
  toDate: string,
  rules: AvailabilityRule[],
  exceptions: string[],
  booked: BookedInterval[],
  slotDurationMinutes: number,
  bufferMinutes: number,
  officeTimezone: string
): SlotResult[] {
  const slots: SlotResult[] = [];
  const exceptionSet = new Set(exceptions);
  const now = new Date();

  for (const dateStr of iterateLocalDates(fromDate, toDate, officeTimezone)) {
    if (exceptionSet.has(dateStr)) continue;

    const dow = getLocalDayOfWeek(dateStr, officeTimezone);
    const [year, month, day] = dateStr.split("-").map(Number);

    for (const rule of rules) {
      if (rule.dayOfWeek !== dow) continue;

      const startMins = parseTime(rule.startTime);
      const endMins = parseTime(rule.endTime);
      let slotStartMins = startMins;

      while (slotStartMins + slotDurationMinutes <= endMins) {
        const hour = Math.floor(slotStartMins / 60);
        const minute = slotStartMins % 60;
        const slotStart = localTimeToUtc(
          year!,
          month!,
          day!,
          hour,
          minute,
          officeTimezone
        );
        const slotEnd = addMinutes(slotStart, slotDurationMinutes);

        if (slotStart > now) {
          const bufferedStart = addMinutes(slotStart, -bufferMinutes);
          const bufferedEnd = addMinutes(slotEnd, bufferMinutes);
          const overlaps = booked.some(
            (b) => bufferedStart < b.endsAt && bufferedEnd > b.startsAt
          );
          if (!overlaps) {
            slots.push({
              startsAt: slotStart.toISOString(),
              endsAt: slotEnd.toISOString(),
              localDate: dateStr,
              labelTime: formatTimeOnly(slotStart, officeTimezone),
              labelLocal: formatLocal(slotStart, officeTimezone),
            });
          }
        }
        slotStartMins += slotDurationMinutes + bufferMinutes;
      }
    }
  }

  return slots;
}

export function formatInterviewTime(
  startsAt: Date,
  timeZone: string
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(startsAt);
}
