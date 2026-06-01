/**
 * Returns next UTC datetime when messaging is allowed (office local quiet hours).
 */
export function nextAllowedSendTime(
  now: Date,
  officeTimezone: string,
  quietStart: string,
  quietEnd: string
): Date {
  const inQuiet = isInQuietHours(now, officeTimezone, quietStart, quietEnd);
  if (!inQuiet) return now;

  const [endH, endM] = quietEnd.split(":").map(Number);
  const local = getLocalParts(now, officeTimezone);
  let targetDay = { ...local };
  if (local.hour >= parseInt(quietStart.split(":")[0]!, 10)) {
    const next = new Date(now);
    next.setUTCDate(next.getUTCDate() + 1);
    targetDay = getLocalParts(next, officeTimezone);
  }
  return localTimeToUtc(
    targetDay.year,
    targetDay.month,
    targetDay.day,
    endH,
    endM,
    officeTimezone
  );
}

export function isInQuietHours(
  now: Date,
  timezone: string,
  quietStart: string,
  quietEnd: string
): boolean {
  const { hour, minute } = getLocalParts(now, timezone);
  const nowMins = hour * 60 + minute;
  const [sh, sm] = quietStart.split(":").map(Number);
  const [eh, em] = quietEnd.split(":").map(Number);
  const startMins = sh! * 60 + sm!;
  const endMins = eh! * 60 + em!;

  if (startMins > endMins) {
    return nowMins >= startMins || nowMins < endMins;
  }
  return nowMins >= startMins && nowMins < endMins;
}

function getLocalParts(
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

function localTimeToUtc(
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
