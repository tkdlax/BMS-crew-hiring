import sql from "mssql";
import { addLocalDays, formatLocalDateKey } from "./timezone.js";
import { getPool, t } from "../db/pool.js";
import { resolveScheduleConfig } from "./resolveConfig.js";
import { generateSlots, type AvailabilityRule } from "./slots.js";

export function getOfficeDateRange(
  officeTimezone: string,
  daysAhead: number
): { from: string; to: string } {
  const from = formatLocalDateKey(new Date(), officeTimezone);
  const to = addLocalDays(from, daysAhead, officeTimezone);
  return { from, to };
}

export async function getAvailabilityRules(
  officeId: number,
  jobId: number
): Promise<AvailabilityRule[]> {
  const pool = await getPool();
  for (const { scope, scopeId } of [
    { scope: "job", scopeId: jobId },
    { scope: "office", scopeId: officeId },
    { scope: "global", scopeId: null as number | null },
  ]) {
    const r = await pool
      .request()
      .input("scope", sql.NVarChar, scope)
      .input("scopeId", sql.Int, scopeId)
      .query(`
        SELECT day_of_week, start_time, end_time FROM ${t("availability_rules")}
        WHERE scope = @scope AND ((@scopeId IS NULL AND scope_id IS NULL) OR scope_id = @scopeId)
      `);
    if (r.recordset.length > 0) {
      return r.recordset.map((row: Record<string, unknown>) => ({
        dayOfWeek: row.day_of_week as number,
        startTime: row.start_time as string,
        endTime: row.end_time as string,
      }));
    }
  }
  return [];
}

export async function getAvailabilityBlocks(
  officeId: number,
  jobId: number
): Promise<{ startsAt: Date; endsAt: Date }[]> {
  const pool = await getPool();
  const intervals: { startsAt: Date; endsAt: Date }[] = [];
  for (const { scope, scopeId } of [
    { scope: "job", scopeId: jobId },
    { scope: "office", scopeId: officeId },
  ]) {
    const r = await pool
      .request()
      .input("scope", sql.NVarChar, scope)
      .input("scopeId", sql.Int, scopeId)
      .query(`
        SELECT starts_at, ends_at FROM ${t("availability_blocks")}
        WHERE scope = @scope AND scope_id = @scopeId AND ends_at >= SYSUTCDATETIME()
      `);
    for (const row of r.recordset) {
      intervals.push({
        startsAt: new Date(row.starts_at as string),
        endsAt: new Date(row.ends_at as string),
      });
    }
  }
  return intervals;
}

export async function getAvailabilityExceptions(
  officeId: number,
  jobId: number
): Promise<string[]> {
  const pool = await getPool();
  const dates = new Set<string>();
  for (const { scope, scopeId } of [
    { scope: "job", scopeId: jobId },
    { scope: "office", scopeId: officeId },
  ]) {
    const r = await pool
      .request()
      .input("scope", sql.NVarChar, scope)
      .input("scopeId", sql.Int, scopeId)
      .query(`
        SELECT exception_date FROM ${t("availability_exceptions")}
        WHERE scope = @scope AND scope_id = @scopeId
      `);
    for (const row of r.recordset) {
      const d = row.exception_date as Date;
      dates.add(d.toISOString().slice(0, 10));
    }
  }
  return [...dates];
}

export async function getAvailableSlots(
  officeId: number,
  jobId: number,
  officeTimezone: string,
  from: string,
  to: string,
  excludeApplicationId?: number
) {
  const config = await resolveScheduleConfig(officeId, jobId);
  const rules = await getAvailabilityRules(officeId, jobId);
  const exceptions = await getAvailabilityExceptions(officeId, jobId);
  const blocks = await getAvailabilityBlocks(officeId, jobId);

  const pool = await getPool();
  const booked = await pool
    .request()
    .input("officeId", sql.Int, officeId)
    .input("excludeAppId", sql.Int, excludeApplicationId ?? null)
    .query(`
      SELECT starts_at, ends_at FROM ${t("interview_bookings")}
      WHERE office_id = @officeId AND starts_at >= SYSUTCDATETIME()
        AND (@excludeAppId IS NULL OR application_id <> @excludeAppId)
    `);

  let slots = generateSlots(
    from,
    to,
    rules,
    exceptions,
    booked.recordset.map((b: Record<string, unknown>) => ({
      startsAt: new Date(b.starts_at as string),
      endsAt: new Date(b.ends_at as string),
    })),
    config.slotDurationMinutes,
    config.bufferMinutes,
    officeTimezone,
    config.slotCapacity,
    blocks
  );

  const now = Date.now();
  const minStart = now + config.minNoticeHours * 60 * 60 * 1000;
  const maxEnd = now + config.bookingWindowDays * 24 * 60 * 60 * 1000;
  slots = slots.filter((s) => {
    const t = new Date(s.startsAt).getTime();
    return t >= minStart && t <= maxEnd;
  });

  return { slots, config };
}

export class SlotNotBookableError extends Error {
  constructor(message = "That time slot is no longer available") {
    super(message);
    this.name = "SlotNotBookableError";
  }
}

/** Match a requested start time to a generated slot (ms precision). */
export function findMatchingSlot(
  slots: { startsAt: string; endsAt: string }[],
  slotStart: Date
): { startsAt: string; endsAt: string } | undefined {
  const target = slotStart.getTime();
  return slots.find((s) => new Date(s.startsAt).getTime() === target);
}

export async function assertSlotBookable(params: {
  officeId: number;
  jobId: number;
  officeTimezone: string;
  slotStart: Date;
  excludeApplicationId?: number;
}): Promise<{ startsAt: Date; endsAt: Date; config: Awaited<ReturnType<typeof resolveScheduleConfig>> }> {
  const { officeId, jobId, officeTimezone, slotStart, excludeApplicationId } = params;
  const config = await resolveScheduleConfig(officeId, jobId);
  const range = getOfficeDateRange(officeTimezone, config.bookingWindowDays);
  const { slots, config: resolvedConfig } = await getAvailableSlots(
    officeId,
    jobId,
    officeTimezone,
    range.from,
    range.to,
    excludeApplicationId
  );
  const match = findMatchingSlot(slots, slotStart);
  if (!match) throw new SlotNotBookableError();
  return {
    startsAt: new Date(match.startsAt),
    endsAt: new Date(match.endsAt),
    config: resolvedConfig,
  };
}
