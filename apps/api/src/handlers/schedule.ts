import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import sql from "mssql";
import { bookSlotSchema } from "@bms/shared";
import { getPool, t } from "../db/pool.js";
import { json, error } from "../http/response.js";
import { resolveScheduleConfig } from "../lib/resolveConfig.js";
import { generateSlots, type AvailabilityRule } from "../lib/slots.js";
import { confirmBooking } from "../services/booking.js";

export async function handleSchedule(
  req: HttpRequest,
  _ctx: InvocationContext,
  segments: string[]
): Promise<HttpResponseInit> {
  const token = segments[0];
  if (!token) return error("Not found", 404);

  if (segments.length === 1 && req.method === "GET") {
    return getScheduleContext(token);
  }
  if (segments[1] === "slots" && req.method === "GET") {
    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to =
      url.searchParams.get("to") ??
      new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    return getSlots(token, from, to);
  }
  if (segments[1] === "book" && req.method === "POST") {
    return bookSlot(token, req);
  }
  return error("Not found", 404);
}

async function resolveToken(token: string) {
  const pool = await getPool();
  const r = await pool.request().input("token", sql.NVarChar, token).query(`
    SELECT tok.id AS token_id, tok.expires_at, tok.used_at,
           a.id AS application_id, a.first_name, a.status,
           j.id AS job_id, j.title AS job_title,
           o.id AS office_id, o.name AS office_name, o.location_label, o.timezone AS office_timezone
    FROM ${t("application_tokens")} tok
    JOIN ${t("applications")} a ON a.id = tok.application_id
    JOIN ${t("jobs")} j ON j.id = a.job_id
    JOIN ${t("offices")} o ON o.id = j.office_id
    WHERE tok.token = @token AND tok.purpose = 'schedule'
  `);
  if (r.recordset.length === 0) return null;
  const row = r.recordset[0] as Record<string, unknown>;
  if (new Date(row.expires_at as string) < new Date()) return { expired: true as const };
  if (row.used_at) return { used: true as const };
  return { row };
}

async function getScheduleContext(token: string): Promise<HttpResponseInit> {
  const resolved = await resolveToken(token);
  if (!resolved) return error("Not found", 404);
  if ("expired" in resolved) return error("This scheduling link has expired", 410);
  if ("used" in resolved) return error("You have already scheduled your interview", 410);

  const row = resolved.row!;
  return json({
    firstName: row.first_name,
    jobTitle: row.job_title,
    officeName: row.office_name,
    officeLocation: row.location_label,
    status: row.status,
  });
}

async function getAvailability(
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

async function getExceptions(
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

async function getSlots(
  token: string,
  from: string,
  to: string
): Promise<HttpResponseInit> {
  const resolved = await resolveToken(token);
  if (!resolved || "expired" in resolved || "used" in resolved) {
    return error("Not found", 404);
  }
  const row = resolved.row!;
  const officeId = row.office_id as number;
  const jobId = row.job_id as number;
  const config = await resolveScheduleConfig(officeId, jobId);
  const rules = await getAvailability(officeId, jobId);
  const exceptions = await getExceptions(officeId, jobId);

  const pool = await getPool();
  const booked = await pool.request().input("officeId", sql.Int, officeId).query(`
    SELECT starts_at, ends_at FROM ${t("interview_bookings")}
    WHERE office_id = @officeId AND starts_at >= SYSUTCDATETIME()
  `);

  const slots = generateSlots(
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
    row.office_timezone as string
  );

  return json({ slots, slotDurationMinutes: config.slotDurationMinutes });
}

async function bookSlot(
  token: string,
  req: HttpRequest
): Promise<HttpResponseInit> {
  const resolved = await resolveToken(token);
  if (!resolved) return error("Not found", 404);
  if ("expired" in resolved) return error("This scheduling link has expired", 410);
  if ("used" in resolved) return error("You have already scheduled your interview", 410);

  const body = (await req.json()) as unknown;
  const parsed = bookSlotSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message, 400);

  const row = resolved.row!;
  const applicationId = row.application_id as number;
  const officeId = row.office_id as number;
  const jobId = row.job_id as number;
  const config = await resolveScheduleConfig(officeId, jobId);
  const startsAt = new Date(parsed.data.slotStart);
  const endsAt = new Date(
    startsAt.getTime() + config.slotDurationMinutes * 60 * 1000
  );

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const overlap = await new sql.Request(tx)
      .input("officeId", sql.Int, officeId)
      .input("start", sql.DateTime2, startsAt)
      .input("end", sql.DateTime2, endsAt)
      .query(`
        SELECT id FROM ${t("interview_bookings")}
        WHERE office_id = @officeId AND starts_at < @end AND ends_at > @start
      `);
    if (overlap.recordset.length > 0) {
      await tx.rollback();
      return error("That time slot is no longer available", 409);
    }

    await new sql.Request(tx)
      .input("appId", sql.Int, applicationId)
      .input("officeId", sql.Int, officeId)
      .input("start", sql.DateTime2, startsAt)
      .input("end", sql.DateTime2, endsAt)
      .input("tz", sql.NVarChar, parsed.data.applicantTimezone)
      .query(`
        INSERT INTO ${t("interview_bookings")}
          (application_id, office_id, starts_at, ends_at, applicant_timezone)
        VALUES (@appId, @officeId, @start, @end, @tz)
      `);

    await new sql.Request(tx)
      .input("token", sql.NVarChar, token)
      .query(`
        UPDATE ${t("application_tokens")} SET used_at = SYSUTCDATETIME()
        WHERE token = @token
      `);

    await new sql.Request(tx)
      .input("appId", sql.Int, applicationId)
      .query(`
        UPDATE ${t("applications")} SET status = 'scheduled', updated_at = SYSUTCDATETIME()
        WHERE id = @appId
      `);

    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }

  await confirmBooking(
    applicationId,
    officeId,
    jobId,
    startsAt,
    endsAt,
    parsed.data.applicantTimezone,
    row.office_timezone as string
  );

  return json({ status: "scheduled", startsAt: startsAt.toISOString() });
}
