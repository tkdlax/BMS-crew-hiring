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
  labelLocal: string;
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h! * 60 + m!;
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60 * 1000);
}

function startOfDayUtc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
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
  let cursor = startOfDayUtc(fromDate);
  const end = startOfDayUtc(toDate);
  end.setUTCDate(end.getUTCDate() + 1);

  while (cursor < end) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (!exceptionSet.has(dateStr)) {
      const dow = cursor.getUTCDay();
      for (const rule of rules) {
        if (rule.dayOfWeek !== dow) continue;
        const startMins = parseTime(rule.startTime);
        const endMins = parseTime(rule.endTime);
        let slotStartMins = startMins;
        while (slotStartMins + slotDurationMinutes <= endMins) {
          const slotStart = new Date(cursor);
          slotStart.setUTCHours(0, slotStartMins, 0, 0);
          const slotEnd = addMinutes(slotStart, slotDurationMinutes);

          if (slotStart > new Date()) {
            const bufferedStart = addMinutes(slotStart, -bufferMinutes);
            const bufferedEnd = addMinutes(slotEnd, bufferMinutes);
            const overlaps = booked.some(
              (b) => bufferedStart < b.endsAt && bufferedEnd > b.startsAt
            );
            if (!overlaps) {
              slots.push({
                startsAt: slotStart.toISOString(),
                endsAt: slotEnd.toISOString(),
                labelLocal: formatLocal(slotStart, officeTimezone),
              });
            }
          }
          slotStartMins += slotDurationMinutes + bufferMinutes;
        }
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return slots;
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
