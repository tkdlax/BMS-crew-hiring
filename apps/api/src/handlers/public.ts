import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import sql from "mssql";
import { getPool, t } from "../db/pool.js";
import { json, error } from "../http/response.js";
import { getAvailableSlots, getOfficeDateRange } from "../lib/scheduleSlots.js";
import { listCalendarEvents } from "../lib/calendarEvents.js";
import { buildOfficeCalendarFeed } from "../lib/icsCalendar.js";

export async function handlePublic(
  req: HttpRequest,
  _ctx: InvocationContext,
  segments: string[]
): Promise<HttpResponseInit> {
  if (
    segments[0] === "calendar" &&
    segments.length === 3 &&
    req.method === "GET"
  ) {
    return getOfficeCalendarFeed(segments[1]!, segments[2]!);
  }
  if (segments[0] === "openings" && req.method === "GET") {
    return listOpenings();
  }
  if (segments[0] === "offices" && segments.length === 2 && req.method === "GET") {
    return getOffice(segments[1]!);
  }
  if (segments[0] === "jobs" && segments.length === 3 && req.method === "GET") {
    const [, officeSlug, jobSlug] = segments;
    return getJob(officeSlug!, jobSlug!);
  }
  if (segments[0] === "schedule-preview" && segments.length === 2 && req.method === "GET") {
    const url = new URL(req.url);
    const jobSlug = url.searchParams.get("job") ?? "moving-operations-crew";
    return getSchedulePreview(segments[1]!, jobSlug);
  }
  return error("Not found", 404);
}

async function getOfficeCalendarFeed(
  officeSlug: string,
  tokenSegment: string
): Promise<HttpResponseInit> {
  const feedToken = tokenSegment.replace(/\.ics$/i, "");
  const pool = await getPool();
  const office = await pool
    .request()
    .input("slug", sql.NVarChar, officeSlug)
    .input("token", sql.NVarChar, feedToken)
    .query(`
      SELECT id, slug, name, location_label, location_notes, timezone, calendar_feed_token
      FROM ${t("offices")}
      WHERE slug = @slug AND calendar_feed_token = @token AND active = 1
    `);
  if (office.recordset.length === 0) return error("Not found", 404);
  const o = office.recordset[0] as Record<string, unknown>;
  const officeId = o.id as number;
  const from = new Date();
  const to = new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);
  const events = await listCalendarEvents(officeId, from, to);
  const ics = buildOfficeCalendarFeed(
    events.map((ev) => ({
      ...ev,
      officeName: o.name as string,
      officeLocation: (o.location_label as string) || "",
      locationNotes: (o.location_notes as string | null) ?? undefined,
    }))
  );
  return {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="baileys-interviews.ics"',
    },
    body: ics,
  };
}

async function getSchedulePreview(
  officeSlug: string,
  jobSlug: string
): Promise<HttpResponseInit> {
  const pool = await getPool();

  const office = await pool
    .request()
    .input("officeSlug", sql.NVarChar, officeSlug)
    .query(`
      SELECT id, slug, name, timezone, location_label
      FROM ${t("offices")} WHERE slug = @officeSlug AND active = 1
    `);
  if (office.recordset.length === 0) return error("Office not found", 404);
  const o = office.recordset[0] as Record<string, unknown>;

  const job = await pool
    .request()
    .input("officeId", sql.Int, o.id)
    .input("jobSlug", sql.NVarChar, jobSlug)
    .query(`
      SELECT id, title, slug FROM ${t("jobs")}
      WHERE office_id = @officeId AND slug = @jobSlug AND active = 1
    `);
  if (job.recordset.length === 0) return error("Job not found", 404);
  const j = job.recordset[0] as Record<string, unknown>;

  const { from, to } = getOfficeDateRange(o.timezone as string, 14);
  const { slots, config } = await getAvailableSlots(
    o.id as number,
    j.id as number,
    o.timezone as string,
    from,
    to
  );

  return json({
    preview: true,
    officeSlug: o.slug,
    officeName: o.name,
    officeLocation: o.location_label,
    officeTimezone: o.timezone,
    jobTitle: j.title,
    jobSlug: j.slug,
    slots,
    slotDurationMinutes: config.slotDurationMinutes,
    bookingWindowDays: config.bookingWindowDays,
    minNoticeHours: config.minNoticeHours,
  });
}

async function listOpenings(): Promise<HttpResponseInit> {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT o.slug AS office_slug, o.name AS office_name,
           j.slug AS job_slug, j.title AS job_title
    FROM ${t("jobs")} j
    JOIN ${t("offices")} o ON o.id = j.office_id
    WHERE j.active = 1 AND o.active = 1
    ORDER BY o.name, j.title
  `);
  return json({ openings: r.recordset });
}

async function getOffice(officeSlug: string): Promise<HttpResponseInit> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("officeSlug", sql.NVarChar, officeSlug)
    .query(`
      SELECT slug, name, timezone, location_label, active
      FROM ${t("offices")}
      WHERE slug = @officeSlug AND active = 1
    `);
  if (r.recordset.length === 0) return error("Office not found", 404);
  const row = r.recordset[0] as Record<string, unknown>;
  return json({
    officeSlug: row.slug,
    officeName: row.name,
    timezone: row.timezone,
    locationLabel: row.location_label,
  });
}

async function getJob(
  officeSlug: string,
  jobSlug: string
): Promise<HttpResponseInit> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("officeSlug", sql.NVarChar, officeSlug)
    .input("jobSlug", sql.NVarChar, jobSlug)
    .query(`
      SELECT j.id, j.slug AS job_slug, j.title, j.pay_min_hourly, j.pay_max_hourly,
             j.form_fields, j.page_content,
             o.id AS office_id, o.slug AS office_slug, o.name AS office_name, o.location_label
      FROM ${t("jobs")} j
      JOIN ${t("offices")} o ON o.id = j.office_id
      WHERE o.slug = @officeSlug AND j.slug = @jobSlug AND j.active = 1 AND o.active = 1
    `);
  if (r.recordset.length === 0) return error("Job not found", 404);
  const row = r.recordset[0] as Record<string, unknown>;
  return json({
    jobId: row.id,
    jobSlug: row.job_slug,
    title: row.title,
    officeSlug: row.office_slug,
    officeName: row.office_name,
    locationLabel: row.location_label,
    payMinHourly: row.pay_min_hourly != null ? Number(row.pay_min_hourly) : null,
    payMaxHourly: row.pay_max_hourly != null ? Number(row.pay_max_hourly) : null,
    formFields: row.form_fields ? JSON.parse(row.form_fields as string) : [],
    pageContent: row.page_content ? JSON.parse(row.page_content as string) : {},
  });
}
