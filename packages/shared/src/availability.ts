/** Short day labels (0 = Sunday). */
export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Normalize "10:00", "10:00:00", etc. to HH:MM. */
export function normalizeTimeHM(value: string): string {
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) throw new Error("Invalid time format — use HH:MM (e.g. 10:00)");
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) throw new Error("Invalid time");
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function timeToMinutes(value: string): number {
  const hm = normalizeTimeHM(value);
  const [h, m] = hm.split(":").map(Number);
  return h! * 60 + m!;
}

export function endAfterStart(startTime: string, endTime: string): boolean {
  return timeToMinutes(endTime) > timeToMinutes(startTime);
}

/** True when ranges share any interior time (touching at one endpoint is allowed). */
export function timeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const a0 = timeToMinutes(startA);
  const a1 = timeToMinutes(endA);
  const b0 = timeToMinutes(startB);
  const b1 = timeToMinutes(endB);
  return a0 < b1 && b0 < a1;
}

export function formatTime12h(value: string): string {
  const mins = timeToMinutes(value);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
