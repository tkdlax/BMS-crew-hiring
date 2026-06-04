import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import sql from "mssql";
import {
  availabilityRuleSchema,
  availabilityExceptionSchema,
  availabilityBlockSchema,
} from "@bms/shared";
import { getPool, t } from "../db/pool.js";
import { json, error } from "../http/response.js";
import { localTimeToUtc } from "./timezone.js";

type Actor =
  | { type: "admin" }
  | { type: "office"; officeId: number };

function enforceOfficeScope(actor: Actor, scopeId: number | null, scope: string): boolean {
  if (actor.type === "admin") return true;
  if (scope !== "office") return false;
  return scopeId === actor.officeId;
}

async function getOfficeTimezone(officeId: number): Promise<string> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("id", sql.Int, officeId)
    .query(`SELECT timezone FROM ${t("offices")} WHERE id = @id`);
  return (r.recordset[0]?.timezone as string) || "America/Denver";
}

export async function handleAvailabilityRoutes(
  req: HttpRequest,
  segments: string[],
  actor: Actor
): Promise<HttpResponseInit> {
  if (segments[0] === "exceptions") {
    return handleExceptions(req, segments.slice(1), actor);
  }
  if (segments[0] === "blocks") {
    return handleBlocks(req, segments.slice(1), actor);
  }

  const pool = await getPool();
  if (segments.length === 0 && req.method === "GET") {
    const url = new URL(req.url);
    let scope = url.searchParams.get("scope") ?? "office";
    let scopeId = url.searchParams.get("scopeId");
    if (actor.type === "office") {
      scope = "office";
      scopeId = String(actor.officeId);
    }
    const r = await pool
      .request()
      .input("scope", sql.NVarChar, scope)
      .input("scopeId", sql.Int, scopeId ? parseInt(scopeId, 10) : null)
      .query(`
        SELECT * FROM ${t("availability_rules")}
        WHERE scope = @scope AND ((@scopeId IS NULL AND scope_id IS NULL) OR scope_id = @scopeId)
      `);
    return json({ rules: r.recordset });
  }
  if (req.method === "POST") {
    const body = availabilityRuleSchema.parse(await req.json());
    if (!enforceOfficeScope(actor, body.scopeId, body.scope)) {
      return error("Forbidden", 403);
    }
    await pool
      .request()
      .input("scope", sql.NVarChar, body.scope)
      .input("scopeId", sql.Int, body.scopeId)
      .input("dow", sql.Int, body.dayOfWeek)
      .input("start", sql.NVarChar, body.startTime)
      .input("end", sql.NVarChar, body.endTime)
      .query(`
        INSERT INTO ${t("availability_rules")} (scope, scope_id, day_of_week, start_time, end_time)
        VALUES (@scope, @scopeId, @dow, @start, @end)
      `);
    return json({ ok: true }, 201);
  }
  if (segments[0] && req.method === "DELETE") {
    const id = parseInt(segments[0], 10);
    if (actor.type === "office") {
      const check = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`SELECT scope, scope_id FROM ${t("availability_rules")} WHERE id = @id`);
      const row = check.recordset[0] as { scope: string; scope_id: number } | undefined;
      if (!row || row.scope !== "office" || row.scope_id !== actor.officeId) {
        return error("Forbidden", 403);
      }
    }
    await pool.request().input("id", sql.Int, id).query(`
      DELETE FROM ${t("availability_rules")} WHERE id = @id
    `);
    return json({ ok: true });
  }
  return error("Not found", 404);
}

async function handleExceptions(
  req: HttpRequest,
  segments: string[],
  actor: Actor
): Promise<HttpResponseInit> {
  const pool = await getPool();
  if (segments.length === 0 && req.method === "GET") {
    const url = new URL(req.url);
    let scope = url.searchParams.get("scope") ?? "office";
    let scopeId = parseInt(url.searchParams.get("scopeId") ?? "0", 10);
    if (actor.type === "office") {
      scope = "office";
      scopeId = actor.officeId;
    }
    const r = await pool
      .request()
      .input("scope", sql.NVarChar, scope)
      .input("scopeId", sql.Int, scopeId)
      .query(`
        SELECT id, exception_date FROM ${t("availability_exceptions")}
        WHERE scope = @scope AND scope_id = @scopeId
        ORDER BY exception_date
      `);
    const exceptions = r.recordset.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      exceptionDate: (row.exception_date as Date).toISOString().slice(0, 10),
    }));
    return json({ exceptions });
  }
  if (segments.length === 0 && req.method === "POST") {
    const body = availabilityExceptionSchema.parse(await req.json());
    if (!enforceOfficeScope(actor, body.scopeId, body.scope)) {
      return error("Forbidden", 403);
    }
    await pool
      .request()
      .input("scope", sql.NVarChar, body.scope)
      .input("scopeId", sql.Int, body.scopeId)
      .input("date", sql.Date, body.exceptionDate)
      .query(`
        INSERT INTO ${t("availability_exceptions")} (scope, scope_id, exception_date)
        VALUES (@scope, @scopeId, @date)
      `);
    return json({ ok: true }, 201);
  }
  if (segments[0] && req.method === "DELETE") {
    const id = parseInt(segments[0], 10);
    if (actor.type === "office") {
      const check = await pool.request().input("id", sql.Int, id).query(`
        SELECT scope, scope_id FROM ${t("availability_exceptions")} WHERE id = @id
      `);
      const row = check.recordset[0] as { scope: string; scope_id: number } | undefined;
      if (!row || row.scope !== "office" || row.scope_id !== actor.officeId) {
        return error("Forbidden", 403);
      }
    }
    await pool.request().input("id", sql.Int, id).query(`
      DELETE FROM ${t("availability_exceptions")} WHERE id = @id
    `);
    return json({ ok: true });
  }
  return error("Not found", 404);
}

async function handleBlocks(
  req: HttpRequest,
  segments: string[],
  actor: Actor
): Promise<HttpResponseInit> {
  const pool = await getPool();
  if (segments.length === 0 && req.method === "GET") {
    const url = new URL(req.url);
    let scope = url.searchParams.get("scope") ?? "office";
    let scopeId = parseInt(url.searchParams.get("scopeId") ?? "0", 10);
    if (actor.type === "office") {
      scope = "office";
      scopeId = actor.officeId;
    }
    const r = await pool
      .request()
      .input("scope", sql.NVarChar, scope)
      .input("scopeId", sql.Int, scopeId)
      .query(`
        SELECT id, starts_at, ends_at, note FROM ${t("availability_blocks")}
        WHERE scope = @scope AND scope_id = @scopeId AND ends_at >= SYSUTCDATETIME()
        ORDER BY starts_at
      `);
    const blocks = r.recordset.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      startsAt: new Date(row.starts_at as string).toISOString(),
      endsAt: new Date(row.ends_at as string).toISOString(),
      note: (row.note as string | null) ?? "",
    }));
    return json({ blocks });
  }
  if (segments.length === 0 && req.method === "POST") {
    const body = availabilityBlockSchema.parse(await req.json());
    if (!enforceOfficeScope(actor, body.scopeId, body.scope)) {
      return error("Forbidden", 403);
    }
    const tz = await getOfficeTimezone(body.scopeId);
    const [y, m, d] = body.localDate.split("-").map(Number);
    const [sh, sm] = body.startTime.split(":").map(Number);
    const [eh, em] = body.endTime.split(":").map(Number);
    const startsAt = localTimeToUtc(y!, m!, d!, sh!, sm!, tz);
    const endsAt = localTimeToUtc(y!, m!, d!, eh!, em!, tz);
    if (endsAt <= startsAt) return error("End time must be after start time", 400);

    await pool
      .request()
      .input("scope", sql.NVarChar, body.scope)
      .input("scopeId", sql.Int, body.scopeId)
      .input("starts", sql.DateTime2, startsAt)
      .input("ends", sql.DateTime2, endsAt)
      .input("note", sql.NVarChar, body.note?.trim() || null)
      .query(`
        INSERT INTO ${t("availability_blocks")} (scope, scope_id, starts_at, ends_at, note)
        VALUES (@scope, @scopeId, @starts, @ends, @note)
      `);
    return json({ ok: true }, 201);
  }
  if (segments[0] && req.method === "DELETE") {
    const id = parseInt(segments[0], 10);
    if (actor.type === "office") {
      const check = await pool.request().input("id", sql.Int, id).query(`
        SELECT scope, scope_id FROM ${t("availability_blocks")} WHERE id = @id
      `);
      const row = check.recordset[0] as { scope: string; scope_id: number } | undefined;
      if (!row || row.scope !== "office" || row.scope_id !== actor.officeId) {
        return error("Forbidden", 403);
      }
    }
    await pool.request().input("id", sql.Int, id).query(`
      DELETE FROM ${t("availability_blocks")} WHERE id = @id
    `);
    return json({ ok: true });
  }
  return error("Not found", 404);
}
