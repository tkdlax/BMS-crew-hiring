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

import {
  getLocalParts,
  localTimeToUtc,
} from "./timezone.js";
