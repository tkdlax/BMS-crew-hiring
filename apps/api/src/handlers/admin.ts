import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import sql from "mssql";
import {
  adminLoginSchema,
  officeUpsertSchema,
  officeCredentialsSchema,
  jobUpsertSchema,
  templateUpsertSchema,
  scheduleConfigUpsertSchema,
  officeWebhooksBatchSchema,
} from "@bms/shared";
import { config } from "../config.js";
import { getPool, t } from "../db/pool.js";
import { json, error } from "../http/response.js";
import {
  verifyAdminPassword,
  createAdminSessionToken,
  requireAdmin,
  readSession,
  sessionCookieHeader,
  clearSessionCookie,
  hashOfficePassword,
} from "../lib/auth/session.js";
import { generateCalendarFeedToken } from "../lib/feedToken.js";
import { listCalendarEvents } from "../lib/calendarEvents.js";
import { handleAvailabilityRoutes } from "../lib/availabilityManage.js";

export async function handleAdmin(
  req: HttpRequest,
  _ctx: InvocationContext,
  segments: string[]
): Promise<HttpResponseInit> {
  if (segments[0] === "login" && req.method === "POST") {
    return adminLogin(req);
  }
  if (segments[0] === "logout" && req.method === "POST") {
    return { status: 200, headers: clearSessionCookie(), body: JSON.stringify({ ok: true }) };
  }
  if (segments[0] === "session" && req.method === "GET") {
    const session = await readSession(req);
    return json({
      authenticated: session?.role === "admin",
      role: session?.role ?? null,
    });
  }

  if (!(await requireAdmin(req))) {
    return error("Unauthorized", 401);
  }

  if (segments[0] === "calendar" && segments[1] === "events" && req.method === "GET") {
    return adminCalendarEvents(req);
  }
  if (segments[0] === "offices") return handleOffices(req, segments.slice(1));
  if (segments[0] === "jobs") return handleJobs(req, segments.slice(1));
  if (segments[0] === "applications") return handleApplicationsList(req);
  if (segments[0] === "templates") return handleTemplates(req, segments.slice(1));
  if (segments[0] === "availability") {
    return handleAvailabilityRoutes(req, segments.slice(1), { type: "admin" });
  }
  if (segments[0] === "schedule-config") return handleScheduleConfig(req, segments.slice(1));
  if (segments[0] === "webhooks") return handleWebhooks(req);

  return error("Not found", 404);
}

async function adminLogin(req: HttpRequest): Promise<HttpResponseInit> {
  const body = (await req.json()) as unknown;
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) return error("Invalid request", 400);
  if (parsed.data.honeypot) {
    return error("Invalid password", 401);
  }
  const ok = await verifyAdminPassword(parsed.data.password);
  if (!ok) return error("Invalid password", 401);
  const token = await createAdminSessionToken();
  return {
    ...json({ ok: true }),
    headers: sessionCookieHeader(token),
  };
}

async function adminCalendarEvents(req: HttpRequest): Promise<HttpResponseInit> {
  const url = new URL(req.url);
  const officeId = parseInt(url.searchParams.get("officeId") ?? "", 10);
  if (!officeId) return error("officeId required", 400);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : new Date();
  const to = toStr
    ? new Date(toStr)
    : new Date(from.getTime() + 90 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return error("Invalid date range", 400);
  }
  const events = await listCalendarEvents(officeId, from, to);
  return json({ events });
}

function mapOfficeRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    timezone: row.timezone,
    location_label: row.location_label,
    location_notes: row.location_notes,
    active: row.active,
    calendar_feed_token: row.calendar_feed_token,
    has_office_password: Boolean(row.office_password_hash),
    webhooks_json: row.webhooks_json,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function handleOffices(
  req: HttpRequest,
  segments: string[]
): Promise<HttpResponseInit> {
  const pool = await getPool();
  if (segments.length === 0 && req.method === "GET") {
    const r = await pool.request().query(`
      SELECT id, slug, name, timezone, location_label, location_notes, active,
             calendar_feed_token,
             CASE WHEN office_password_hash IS NOT NULL THEN 1 ELSE 0 END AS has_office_password,
             webhooks_json, created_at, updated_at
      FROM ${t("offices")} ORDER BY name
    `);
    return json({ offices: r.recordset.map(mapOfficeRow) });
  }
  if (segments.length === 0 && req.method === "POST") {
    const body = officeUpsertSchema.parse(await req.json());
    const locationNotes = body.locationNotes?.trim() || null;
    const feedToken = generateCalendarFeedToken();
    await pool
      .request()
      .input("slug", sql.NVarChar, body.slug)
      .input("name", sql.NVarChar, body.name)
      .input("tz", sql.NVarChar, body.timezone)
      .input("loc", sql.NVarChar, body.locationLabel)
      .input("locNotes", sql.NVarChar, locationNotes)
      .input("active", sql.Bit, body.active ?? true)
      .input("feedToken", sql.NVarChar, feedToken)
      .query(`
        INSERT INTO ${t("offices")}
          (slug, name, timezone, location_label, location_notes, active, calendar_feed_token)
        VALUES (@slug, @name, @tz, @loc, @locNotes, @active, @feedToken)
      `);
    return json({ ok: true }, 201);
  }
  const id = parseInt(segments[0]!, 10);
  if (segments[1] === "credentials" && req.method === "PUT") {
    const body = officeCredentialsSchema.parse(await req.json());
    const hash = await hashOfficePassword(body.password);
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("hash", sql.NVarChar, hash)
      .query(`
        UPDATE ${t("offices")} SET office_password_hash = @hash, updated_at = SYSUTCDATETIME()
        WHERE id = @id
      `);
    return json({ ok: true });
  }
  if (segments[1] === "regenerate-feed-token" && req.method === "POST") {
    const feedToken = generateCalendarFeedToken();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("feedToken", sql.NVarChar, feedToken)
      .query(`
        UPDATE ${t("offices")} SET calendar_feed_token = @feedToken, updated_at = SYSUTCDATETIME()
        WHERE id = @id
      `);
    return json({ ok: true, calendarFeedToken: feedToken });
  }
  if (segments.length === 1 && req.method === "PUT") {
    const body = officeUpsertSchema.parse(await req.json());
    const locationNotes = body.locationNotes?.trim() || null;
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("slug", sql.NVarChar, body.slug)
      .input("name", sql.NVarChar, body.name)
      .input("tz", sql.NVarChar, body.timezone)
      .input("loc", sql.NVarChar, body.locationLabel)
      .input("locNotes", sql.NVarChar, locationNotes)
      .input("active", sql.Bit, body.active ?? true)
      .query(`
        UPDATE ${t("offices")} SET slug=@slug, name=@name, timezone=@tz,
          location_label=@loc, location_notes=@locNotes, active=@active, updated_at=SYSUTCDATETIME()
        WHERE id=@id
      `);
    return json({ ok: true });
  }
  return error("Not found", 404);
}

async function handleJobs(
  req: HttpRequest,
  segments: string[]
): Promise<HttpResponseInit> {
  const pool = await getPool();
  if (segments.length === 0 && req.method === "GET") {
    const url = new URL(req.url);
    const officeId = url.searchParams.get("officeId");
    const r = await pool
      .request()
      .input("officeId", sql.Int, officeId ? parseInt(officeId, 10) : null)
      .query(`
        SELECT j.*, o.slug AS office_slug, o.name AS office_name
        FROM ${t("jobs")} j
        JOIN ${t("offices")} o ON o.id = j.office_id
        WHERE (@officeId IS NULL OR j.office_id = @officeId)
        ORDER BY o.name, j.title
      `);
    const jobs = r.recordset.map((row: Record<string, unknown>) => {
      const pageContent = row.page_content
        ? (JSON.parse(row.page_content as string) as Record<string, unknown>)
        : {};
      const formFields = row.form_fields
        ? (JSON.parse(row.form_fields as string) as unknown[])
        : [];
      return {
        ...row,
        page_content: pageContent,
        form_fields: formFields,
        applyUrl: `${config.publicSiteBaseUrl}/apply/${row.office_slug}/${row.slug}`,
      };
    });
    return json({ jobs });
  }
  if (segments.length === 0 && req.method === "POST") {
    const body = jobUpsertSchema.parse(await req.json());
    await pool
      .request()
      .input("officeId", sql.Int, body.officeId)
      .input("slug", sql.NVarChar, body.slug)
      .input("title", sql.NVarChar, body.title)
      .input("active", sql.Bit, body.active ?? true)
      .input("payMin", sql.Decimal(6, 2), body.payMinHourly ?? null)
      .input("payMax", sql.Decimal(6, 2), body.payMaxHourly ?? null)
      .input("form", sql.NVarChar, JSON.stringify(body.formFields ?? []))
      .input("page", sql.NVarChar, JSON.stringify(body.pageContent ?? {}))
      .query(`
        INSERT INTO ${t("jobs")} (office_id, slug, title, active, pay_min_hourly, pay_max_hourly, form_fields, page_content)
        VALUES (@officeId, @slug, @title, @active, @payMin, @payMax, @form, @page)
      `);
    return json({ ok: true }, 201);
  }
  const id = parseInt(segments[0]!, 10);
  if (segments.length === 1 && req.method === "PUT") {
    const body = jobUpsertSchema.parse(await req.json());
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("officeId", sql.Int, body.officeId)
      .input("slug", sql.NVarChar, body.slug)
      .input("title", sql.NVarChar, body.title)
      .input("active", sql.Bit, body.active ?? true)
      .input("payMin", sql.Decimal(6, 2), body.payMinHourly ?? null)
      .input("payMax", sql.Decimal(6, 2), body.payMaxHourly ?? null)
      .input("form", sql.NVarChar, JSON.stringify(body.formFields ?? []))
      .input("page", sql.NVarChar, JSON.stringify(body.pageContent ?? {}))
      .query(`
        UPDATE ${t("jobs")} SET office_id=@officeId, slug=@slug, title=@title,
          active=@active, pay_min_hourly=@payMin, pay_max_hourly=@payMax,
          form_fields=@form, page_content=@page, updated_at=SYSUTCDATETIME()
        WHERE id=@id
      `);
    return json({ ok: true });
  }
  return error("Not found", 404);
}

async function handleApplicationsList(req: HttpRequest): Promise<HttpResponseInit> {
  const url = new URL(req.url);
  const officeId = url.searchParams.get("officeId");
  const jobId = url.searchParams.get("jobId");
  const pool = await getPool();
  const r = await pool
    .request()
    .input("officeId", sql.Int, officeId ? parseInt(officeId, 10) : null)
    .input("jobId", sql.Int, jobId ? parseInt(jobId, 10) : null)
    .query(`
      SELECT a.id, a.first_name, a.last_name, a.email, a.phone, a.status, a.created_at,
             j.title AS job_title, j.slug AS job_slug,
             o.name AS office_name, o.slug AS office_slug,
             b.starts_at AS interview_starts_at
      FROM ${t("applications")} a
      JOIN ${t("jobs")} j ON j.id = a.job_id
      JOIN ${t("offices")} o ON o.id = j.office_id
      LEFT JOIN ${t("interview_bookings")} b ON b.application_id = a.id
      WHERE (@officeId IS NULL OR o.id = @officeId)
        AND (@jobId IS NULL OR j.id = @jobId)
      ORDER BY a.created_at DESC
    `);
  return json({ applications: r.recordset });
}

async function handleTemplates(
  req: HttpRequest,
  segments: string[]
): Promise<HttpResponseInit> {
  const pool = await getPool();
  if (segments.length === 0 && req.method === "GET") {
    const r = await pool.request().query(`
      SELECT * FROM ${t("message_templates")} ORDER BY template_key, channel, scope
    `);
    return json({ templates: r.recordset });
  }
  if (req.method === "POST") {
    const body = templateUpsertSchema.parse(await req.json());
    await pool
      .request()
      .input("key", sql.NVarChar, body.templateKey)
      .input("channel", sql.NVarChar, body.channel)
      .input("scope", sql.NVarChar, body.scope)
      .input("scopeId", sql.Int, body.scopeId)
      .input("subject", sql.NVarChar, body.subject ?? null)
      .input("body", sql.NVarChar, body.body)
      .query(`
        MERGE ${t("message_templates")} AS target
        USING (SELECT @key AS template_key, @channel AS channel, @scope AS scope, @scopeId AS scope_id) AS src
        ON target.template_key = src.template_key AND target.channel = src.channel
          AND target.scope = src.scope
          AND ((target.scope_id IS NULL AND src.scope_id IS NULL) OR target.scope_id = src.scope_id)
        WHEN MATCHED THEN UPDATE SET subject = @subject, body = @body, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT (template_key, channel, scope, scope_id, subject, body)
          VALUES (@key, @channel, @scope, @scopeId, @subject, @body);
      `);
    return json({ ok: true });
  }
  return error("Not found", 404);
}

async function handleWebhooks(req: HttpRequest): Promise<HttpResponseInit> {
  const pool = await getPool();
  if (req.method === "GET") {
    const r = await pool.request().query(`
      SELECT id, slug, name, webhooks_json FROM ${t("offices")} ORDER BY name
    `);
    const offices = r.recordset.map((row: Record<string, unknown>) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      webhooks: parseOfficeWebhooksJson(row.webhooks_json as string | null),
    }));
    return json({ offices });
  }
  if (req.method === "PUT") {
    const body = officeWebhooksBatchSchema.parse(await req.json());
    for (const entry of body.offices) {
      const normalized = normalizeWebhooks(entry.webhooks);
      await pool
        .request()
        .input("id", sql.Int, entry.officeId)
        .input("json", sql.NVarChar, JSON.stringify(normalized))
        .query(`
          UPDATE ${t("offices")} SET webhooks_json = @json, updated_at = SYSUTCDATETIME()
          WHERE id = @id
        `);
    }
    return json({ ok: true });
  }
  return error("Not found", 404);
}

function parseOfficeWebhooksJson(json: string | null | undefined): Record<string, string> {
  if (!json?.trim()) return {};
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return {};
  }
}

function normalizeWebhooks(input: {
  application_submitted?: string;
  interview_scheduled?: string;
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ["application_submitted", "interview_scheduled"] as const) {
    const url = input[key]?.trim();
    if (url) out[key] = url;
  }
  return out;
}

async function handleScheduleConfig(
  req: HttpRequest,
  segments: string[]
): Promise<HttpResponseInit> {
  const pool = await getPool();
  if (req.method === "GET") {
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "global";
    const scopeId = url.searchParams.get("scopeId");
    const r = await pool
      .request()
      .input("scope", sql.NVarChar, scope)
      .input("scopeId", sql.Int, scopeId ? parseInt(scopeId, 10) : null)
      .query(`
        SELECT * FROM ${t("schedule_config")}
        WHERE scope = @scope AND ((@scopeId IS NULL AND scope_id IS NULL) OR scope_id = @scopeId)
      `);
    return json({ config: r.recordset[0] ?? null });
  }
  if (req.method === "PUT") {
    const body = scheduleConfigUpsertSchema.parse(await req.json());
    const existing = (
      await pool
        .request()
        .input("scope", sql.NVarChar, body.scope)
        .input("scopeId", sql.Int, body.scopeId)
        .query(`
          SELECT * FROM ${t("schedule_config")}
          WHERE scope = @scope AND ((@scopeId IS NULL AND scope_id IS NULL) OR scope_id = @scopeId)
        `)
    ).recordset[0] as Record<string, unknown> | undefined;
    const webhookUrl =
      body.webhookUrl !== undefined
        ? body.webhookUrl === "" || body.webhookUrl === null
          ? null
          : body.webhookUrl
        : (existing?.webhook_url as string | null | undefined) ?? null;
    await pool
      .request()
      .input("scope", sql.NVarChar, body.scope)
      .input("scopeId", sql.Int, body.scopeId)
      .input("slot", sql.Int, body.slotDurationMinutes ?? (existing?.slot_duration_minutes as number) ?? 30)
      .input("buffer", sql.Int, body.bufferMinutes ?? (existing?.buffer_minutes as number) ?? 15)
      .input("slotCap", sql.Int, body.slotCapacity ?? (existing?.slot_capacity as number) ?? 2)
      .input("qhStart", sql.NVarChar, body.quietHoursStart ?? (existing?.quiet_hours_start as string) ?? "21:00")
      .input("qhEnd", sql.NVarChar, body.quietHoursEnd ?? (existing?.quiet_hours_end as string) ?? "08:00")
      .input("reminders", sql.NVarChar, body.reminderOffsetsJson ?? (existing?.reminder_offsets_json as string) ?? "[]")
      .input("tokenDays", sql.Int, body.tokenExpiryDays ?? (existing?.token_expiry_days as number) ?? 14)
      .input("smsInvite", sql.Bit, body.smsOnInvite ?? (existing?.sms_on_invite as boolean) ?? false)
      .input("bookDays", sql.Int, body.bookingWindowDays ?? (existing?.booking_window_days as number) ?? 7)
      .input("noticeHrs", sql.Int, body.minNoticeHours ?? (existing?.min_notice_hours as number) ?? 8)
      .input("webhookUrl", sql.NVarChar, webhookUrl)
      .input("webhookEvents", sql.NVarChar, body.webhookEventsJson ?? (existing?.webhook_events_json as string) ?? "[]")
      .query(`
        MERGE ${t("schedule_config")} AS target
        USING (SELECT @scope AS scope, @scopeId AS scope_id) AS src
        ON target.scope = src.scope AND ((target.scope_id IS NULL AND src.scope_id IS NULL) OR target.scope_id = src.scope_id)
        WHEN MATCHED THEN UPDATE SET
          slot_duration_minutes = @slot, buffer_minutes = @buffer, slot_capacity = @slotCap,
          quiet_hours_start = @qhStart, quiet_hours_end = @qhEnd,
          reminder_offsets_json = @reminders, token_expiry_days = @tokenDays,
          sms_on_invite = @smsInvite, booking_window_days = @bookDays,
          min_notice_hours = @noticeHrs, webhook_url = @webhookUrl,
          webhook_events_json = @webhookEvents, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT (scope, scope_id, slot_duration_minutes, buffer_minutes, slot_capacity,
          quiet_hours_start, quiet_hours_end, reminder_offsets_json, token_expiry_days, sms_on_invite,
          booking_window_days, min_notice_hours, webhook_url, webhook_events_json)
          VALUES (@scope, @scopeId, @slot, @buffer, @slotCap, @qhStart, @qhEnd, @reminders, @tokenDays, @smsInvite,
            @bookDays, @noticeHrs, @webhookUrl, @webhookEvents);
      `);
    return json({ ok: true });
  }
  return error("Not found", 404);
}
