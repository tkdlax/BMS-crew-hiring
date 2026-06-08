import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import sql from "mssql";
import { bookSlotSchema } from "@bms/shared";
import { getPool, t } from "../db/pool.js";
import { json, error } from "../http/response.js";
import {
  assertSlotBookable,
  getAvailableSlots,
  getOfficeDateRange,
  SlotNotBookableError,
} from "../lib/scheduleSlots.js";
import { formatInterviewTime } from "../lib/slots.js";
import {
  interviewTimeForBooking,
  loadApplicationRow,
} from "../lib/applicationContext.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { confirmBooking, rescheduleBooking } from "../services/booking.js";

type TokenRow = Record<string, unknown>;

async function fetchTokenRow(token: string): Promise<TokenRow | null> {
  const pool = await getPool();
  const r = await pool.request().input("token", sql.NVarChar, token).query(`
    SELECT tok.id AS token_id, tok.expires_at, tok.used_at,
           a.id AS application_id, a.first_name, a.last_name, a.status,
           j.id AS job_id, j.title AS job_title,
           o.id AS office_id, o.name AS office_name, o.location_label, o.location_notes, o.timezone AS office_timezone
    FROM ${t("application_tokens")} tok
    JOIN ${t("applications")} a ON a.id = tok.application_id
    JOIN ${t("jobs")} j ON j.id = a.job_id
    JOIN ${t("offices")} o ON o.id = j.office_id
    WHERE tok.token = @token AND tok.purpose = 'schedule'
  `);
  if (r.recordset.length === 0) return null;
  return r.recordset[0] as TokenRow;
}

async function fetchBookingForApplication(applicationId: number) {
  const pool = await getPool();
  const r = await pool.request().input("appId", sql.Int, applicationId).query(`
    SELECT id, starts_at, ends_at, applicant_timezone, attendance_confirmed_at, attendance_status
    FROM ${t("interview_bookings")} WHERE application_id = @appId
  `);
  return (r.recordset[0] as Record<string, unknown>) ?? null;
}

function tokenExpired(row: TokenRow): boolean {
  return new Date(row.expires_at as string) < new Date();
}

async function buildBookingResponse(
  applicationId: number,
  startsAt: Date,
  endsAt: Date,
  applicantTimezone: string,
  officeTimezone: string
): Promise<HttpResponseInit> {
  const app = await loadApplicationRow(applicationId);
  if (!app) return json({ status: "scheduled", startsAt: startsAt.toISOString() });

  const interviewTimeLocal = interviewTimeForBooking(
    startsAt,
    applicantTimezone,
    officeTimezone
  );

  return json({
    status: "scheduled",
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    firstName: app.firstName,
    lastName: app.lastName,
    jobTitle: app.jobTitle,
    officeName: app.officeName,
    officeLocation: app.officeLocation,
    locationNotes: app.officeLocationNotes || undefined,
    interviewTimeLocal,
    primaryInterest: app.primaryInterest || undefined,
  });
}

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
    const row = await fetchTokenRow(token);
    if (!row) return error("Not found", 404);
    const range = getOfficeDateRange(row.office_timezone as string, 14);
    const from = url.searchParams.get("from") ?? range.from;
    const to = url.searchParams.get("to") ?? range.to;
    return getSlots(token, from, to, row);
  }
  if (segments[1] === "book" && req.method === "POST") {
    return bookSlot(token, req);
  }
  if (segments[1] === "reschedule" && req.method === "POST") {
    return rescheduleSlot(token, req);
  }
  if (segments[1] === "confirm-attendance" && req.method === "POST") {
    return confirmAttendance(token, req);
  }
  return error("Not found", 404);
}

async function getScheduleContext(token: string): Promise<HttpResponseInit> {
  const row = await fetchTokenRow(token);
  if (!row) return error("Not found", 404);
  if (tokenExpired(row)) {
    return error("This scheduling link has expired", 410);
  }

  if (row.used_at) {
    const booking = await fetchBookingForApplication(row.application_id as number);
    if (!booking) {
      return error("You have already scheduled your interview", 410);
    }
    const tz = (booking.applicant_timezone as string) || (row.office_timezone as string);
    const startsAt = new Date(booking.starts_at as string);
    const interviewTimeLocal = formatInterviewTime(startsAt, tz);
    const app = await loadApplicationRow(row.application_id as number);
    return json({
      mode: "confirm_attendance",
      canReschedule: true,
      firstName: row.first_name,
      jobTitle: row.job_title,
      officeName: row.office_name,
      officeLocation: row.location_label,
      locationNotes: (row.location_notes as string | null) ?? "",
      interviewTimeLocal,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(booking.ends_at as string).toISOString(),
      primaryInterest: app?.primaryInterest || undefined,
      attendanceStatus: booking.attendance_status ?? null,
      attendanceConfirmedAt: booking.attendance_confirmed_at ?? null,
      officeTimezone: row.office_timezone,
    });
  }

  return json({
    mode: "schedule",
    firstName: row.first_name,
    jobTitle: row.job_title,
    officeName: row.office_name,
    officeLocation: row.location_label,
    officeTimezone: row.office_timezone,
    status: row.status,
  });
}

async function getSlots(
  token: string,
  from: string,
  to: string,
  row?: TokenRow | null
): Promise<HttpResponseInit> {
  const resolved = row ?? (await fetchTokenRow(token));
  if (!resolved) return error("Not found", 404);
  if (tokenExpired(resolved)) {
    return error("This scheduling link has expired", 410);
  }

  let excludeApplicationId: number | undefined;
  if (resolved.used_at) {
    const booking = await fetchBookingForApplication(resolved.application_id as number);
    if (!booking) {
      return error("Interview already scheduled — use this link to confirm attendance", 409);
    }
    excludeApplicationId = resolved.application_id as number;
  }

  const officeId = resolved.office_id as number;
  const jobId = resolved.job_id as number;
  const { slots, config } = await getAvailableSlots(
    officeId,
    jobId,
    resolved.office_timezone as string,
    from,
    to,
    excludeApplicationId
  );

  return json({
    slots,
    officeTimezone: resolved.office_timezone,
    slotDurationMinutes: config.slotDurationMinutes,
    bookingWindowDays: config.bookingWindowDays,
    minNoticeHours: config.minNoticeHours,
    rescheduling: Boolean(excludeApplicationId),
  });
}

async function bookSlot(
  token: string,
  req: HttpRequest
): Promise<HttpResponseInit> {
  const row = await fetchTokenRow(token);
  if (!row) return error("Not found", 404);
  if (tokenExpired(row)) {
    return error("This scheduling link has expired", 410);
  }
  if (row.used_at) return error("You have already scheduled your interview", 410);

  if (!(await checkRateLimit(`schedule:book:${token}`, 10))) {
    return error("Too many booking attempts. Please try again later.", 429);
  }

  const body = (await req.json()) as unknown;
  const parsed = bookSlotSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message, 400);

  const applicationId = row.application_id as number;
  const officeId = row.office_id as number;
  const jobId = row.job_id as number;
  const officeTimezone = row.office_timezone as string;

  let startsAt: Date;
  let endsAt: Date;
  let slotConfig;
  try {
    const validated = await assertSlotBookable({
      officeId,
      jobId,
      officeTimezone,
      slotStart: new Date(parsed.data.slotStart),
    });
    startsAt = validated.startsAt;
    endsAt = validated.endsAt;
    slotConfig = validated.config;
  } catch (e) {
    if (e instanceof SlotNotBookableError) return error(e.message, 409);
    throw e;
  }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const overlap = await new sql.Request(tx)
      .input("officeId", sql.Int, officeId)
      .input("start", sql.DateTime2, startsAt)
      .input("end", sql.DateTime2, endsAt)
      .query(`
        SELECT COUNT(*) AS cnt FROM ${t("interview_bookings")} WITH (UPDLOCK, HOLDLOCK)
        WHERE office_id = @officeId AND starts_at < @end AND ends_at > @start
      `);
    const bookedCount = (overlap.recordset[0] as { cnt: number }).cnt;
    if (bookedCount >= slotConfig.slotCapacity) {
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
    officeTimezone
  );

  return buildBookingResponse(
    applicationId,
    startsAt,
    endsAt,
    parsed.data.applicantTimezone,
    officeTimezone
  );
}

async function rescheduleSlot(
  token: string,
  req: HttpRequest
): Promise<HttpResponseInit> {
  const row = await fetchTokenRow(token);
  if (!row) return error("Not found", 404);
  if (tokenExpired(row)) {
    return error("This scheduling link has expired", 410);
  }
  if (!row.used_at) {
    return error("Please schedule your interview first", 400);
  }

  if (!(await checkRateLimit(`schedule:reschedule:${token}`, 5))) {
    return error("Too many reschedule attempts. Please try again later.", 429);
  }

  const booking = await fetchBookingForApplication(row.application_id as number);
  if (!booking) return error("No interview booking found", 404);

  const body = (await req.json()) as unknown;
  const parsed = bookSlotSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message, 400);

  const applicationId = row.application_id as number;
  const officeId = row.office_id as number;
  const jobId = row.job_id as number;
  const officeTimezone = row.office_timezone as string;
  const bookingId = booking.id as number;

  let startsAt: Date;
  let endsAt: Date;
  let slotConfig;
  try {
    const validated = await assertSlotBookable({
      officeId,
      jobId,
      officeTimezone,
      slotStart: new Date(parsed.data.slotStart),
      excludeApplicationId: applicationId,
    });
    startsAt = validated.startsAt;
    endsAt = validated.endsAt;
    slotConfig = validated.config;
  } catch (e) {
    if (e instanceof SlotNotBookableError) return error(e.message, 409);
    throw e;
  }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const overlap = await new sql.Request(tx)
      .input("officeId", sql.Int, officeId)
      .input("appId", sql.Int, applicationId)
      .input("start", sql.DateTime2, startsAt)
      .input("end", sql.DateTime2, endsAt)
      .query(`
        SELECT COUNT(*) AS cnt FROM ${t("interview_bookings")} WITH (UPDLOCK, HOLDLOCK)
        WHERE office_id = @officeId AND application_id <> @appId
          AND starts_at < @end AND ends_at > @start
      `);
    const bookedCount = (overlap.recordset[0] as { cnt: number }).cnt;
    if (bookedCount >= slotConfig.slotCapacity) {
      await tx.rollback();
      return error("That time slot is no longer available", 409);
    }

    await new sql.Request(tx)
      .input("appId", sql.Int, applicationId)
      .input("start", sql.DateTime2, startsAt)
      .input("end", sql.DateTime2, endsAt)
      .input("tz", sql.NVarChar, parsed.data.applicantTimezone)
      .query(`
        UPDATE ${t("interview_bookings")}
        SET starts_at = @start, ends_at = @end, applicant_timezone = @tz,
            attendance_status = NULL, attendance_confirmed_at = NULL
        WHERE application_id = @appId
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

  await rescheduleBooking(
    applicationId,
    officeId,
    jobId,
    bookingId,
    startsAt,
    endsAt,
    parsed.data.applicantTimezone,
    officeTimezone
  );

  return buildBookingResponse(
    applicationId,
    startsAt,
    endsAt,
    parsed.data.applicantTimezone,
    officeTimezone
  );
}

async function confirmAttendance(
  token: string,
  req: HttpRequest
): Promise<HttpResponseInit> {
  const row = await fetchTokenRow(token);
  if (!row) return error("Not found", 404);
  if (tokenExpired(row)) {
    return error("This link has expired", 410);
  }
  if (!row.used_at) {
    return error("Please schedule your interview first", 400);
  }

  const body = (await req.json()) as { attending?: boolean };
  if (typeof body.attending !== "boolean") {
    return error("attending (true/false) is required", 400);
  }

  const applicationId = row.application_id as number;
  const status = body.attending ? "confirmed" : "declined";

  const pool = await getPool();
  await pool
    .request()
    .input("appId", sql.Int, applicationId)
    .input("status", sql.NVarChar, status)
    .query(`
      UPDATE ${t("interview_bookings")}
      SET attendance_status = @status, attendance_confirmed_at = SYSUTCDATETIME()
      WHERE application_id = @appId
    `);

  if (body.attending) {
    await pool
      .request()
      .input("appId", sql.Int, applicationId)
      .query(`
        UPDATE ${t("applications")} SET status = 'reminded', updated_at = SYSUTCDATETIME()
        WHERE id = @appId
      `);
  }

  return json({
    ok: true,
    attendanceStatus: status,
    message: body.attending
      ? "Thank you — we look forward to seeing you!"
      : "Thanks for letting us know. Our team may reach out to reschedule.",
  });
}
