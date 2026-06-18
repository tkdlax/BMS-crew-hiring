import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import sql from "mssql";
import { officeLoginSchema } from "@bms/shared";
import { getPool, t } from "../db/pool.js";
import { json, error } from "../http/response.js";
import {
  createOfficeSessionToken,
  requireOffice,
  verifyOfficePassword,
  sessionCookieHeader,
  clearSessionCookie,
  readSession,
} from "../lib/auth/session.js";
import { listCalendarEvents } from "../lib/calendarEvents.js";
import { handleAvailabilityRoutes } from "../lib/availabilityManage.js";
import { checkRateLimit } from "../lib/rateLimit.js";

export async function handleOffice(
  req: HttpRequest,
  _ctx: InvocationContext,
  segments: string[]
): Promise<HttpResponseInit> {
  if (segments[0] === "login" && req.method === "POST") {
    return officeLogin(req);
  }
  if (segments[0] === "logout" && req.method === "POST") {
    return { status: 200, headers: clearSessionCookie(), body: JSON.stringify({ ok: true }) };
  }
  if (segments[0] === "session" && req.method === "GET") {
    const session = await readSession(req);
    if (session?.role !== "office") {
      return json({ authenticated: false });
    }
    const pool = await getPool();
    const r = await pool
      .request()
      .input("id", sql.Int, session.officeId)
      .query(`
        SELECT id, slug, name, timezone, calendar_feed_token FROM ${t("offices")} WHERE id = @id
      `);
    const office = r.recordset[0] as Record<string, unknown> | undefined;
    return json({
      authenticated: true,
      role: "office",
      office: office
        ? {
            id: office.id,
            slug: office.slug,
            name: office.name,
            timezone: office.timezone,
            calendarFeedToken: office.calendar_feed_token,
          }
        : null,
    });
  }

  const officeSession = await requireOffice(req);
  if (!officeSession) return error("Unauthorized", 401);

  if (segments[0] === "calendar" && segments[1] === "events" && req.method === "GET") {
    return calendarEvents(req, officeSession.officeId);
  }
  if (segments[0] === "availability") {
    return handleAvailabilityRoutes(req, segments.slice(1), {
      type: "office",
      officeId: officeSession.officeId,
    });
  }

  return error("Not found", 404);
}

async function officeLogin(req: HttpRequest): Promise<HttpResponseInit> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(`login:office:ip:${ip}`, 20))) {
    return error("Too many login attempts. Please try again later.", 429);
  }

  const body = (await req.json()) as unknown;
  const parsed = officeLoginSchema.safeParse(body);
  if (!parsed.success) return error("Invalid request", 400);
  if (parsed.data.honeypot) return error("Invalid credentials", 401);

  const pool = await getPool();
  const r = await pool
    .request()
    .input("slug", sql.NVarChar, parsed.data.officeSlug)
    .query(`
      SELECT id, slug, office_password_hash, active FROM ${t("offices")} WHERE slug = @slug
    `);
  const row = r.recordset[0] as Record<string, unknown> | undefined;
  if (!row || !row.active) return error("Invalid credentials", 401);

  const ok = await verifyOfficePassword(
    row.office_password_hash as string | null,
    parsed.data.password
  );
  if (!ok) return error("Invalid credentials", 401);

  const token = await createOfficeSessionToken(row.id as number, row.slug as string);
  return {
    ...json({ ok: true, officeSlug: row.slug }),
    headers: sessionCookieHeader(token),
  };
}

async function calendarEvents(
  req: HttpRequest,
  officeId: number
): Promise<HttpResponseInit> {
  const url = new URL(req.url);
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
