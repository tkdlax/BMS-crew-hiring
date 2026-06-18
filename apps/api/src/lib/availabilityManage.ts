import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import sql from "mssql";
import {
  availabilityRuleSchema,
  availabilityRuleUpdateSchema,
  availabilityExceptionSchema,
  availabilityBlockSchema,
  zodFirstErrorMessage,
  DAY_NAMES,
  normalizeTimeHM,
  formatTime12h,
} from "@bms/shared";
import { getPool, t } from "../db/pool.js";
import { json, error } from "../http/response.js";
import { localTimeToUtc } from "./timezone.js";
import {
  exceptionExists,
  findOverlappingBlock,
  findOverlappingRule,
  getRuleById,
} from "./availabilityConflicts.js";

type Actor =
  | { type: "admin" }
  | { type: "office"; officeId: number };

function asScopeId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function officeScopeMatches(
  actor: Actor,
  scopeId: unknown,
  scope: string
): boolean {
  if (actor.type === "admin") return true;
  if (scope.trim().toLowerCase() !== "office") return false;
  const ruleOfficeId = asScopeId(scopeId);
  if (ruleOfficeId == null) return false;
  return ruleOfficeId === asScopeId(actor.officeId);
}

function enforceOfficeScope(actor: Actor, scopeId: number | null, scope: string): boolean {
  return officeScopeMatches(actor, scopeId, scope);
}

async function getOfficeTimezone(officeId: number): Promise<string> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("id", sql.Int, officeId)
    .query(`SELECT timezone FROM ${t("offices")} WHERE id = @id`);
  return (r.recordset[0]?.timezone as string) || "America/Denver";
}

function overlapRuleMessage(dayOfWeek: number, start: string, end: string): string {
  const day = DAY_NAMES[dayOfWeek] ?? "that day";
  return `This overlaps existing hours on ${day} (${formatTime12h(start)}–${formatTime12h(end)}). Edit or remove the other block first.`;
}

function mapRuleRow(row: Record<string, unknown>) {
  const start = normalizeTimeHM(String(row.start_time));
  const end = normalizeTimeHM(String(row.end_time));
  return {
    id: row.id as number,
    dayOfWeek: row.day_of_week as number,
    startTime: start,
    endTime: end,
    day_of_week: row.day_of_week as number,
    start_time: start,
    end_time: end,
  };
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
        ORDER BY day_of_week, start_time
      `);
    const rules = r.recordset.map(mapRuleRow);
    return json({ rules });
  }
  if (segments.length === 0 && req.method === "POST") {
    const parsed = availabilityRuleSchema.safeParse(await req.json());
    if (!parsed.success) return error(zodFirstErrorMessage(parsed.error), 400);
    const body = parsed.data;
    if (!enforceOfficeScope(actor, body.scopeId, body.scope)) {
      return error("Forbidden", 403);
    }
    const startTime = normalizeTimeHM(body.startTime);
    const endTime = normalizeTimeHM(body.endTime);
    const overlap = await findOverlappingRule(
      body.scope,
      body.scopeId,
      body.dayOfWeek,
      startTime,
      endTime
    );
    if (overlap) {
      return error(
        overlapRuleMessage(overlap.day_of_week, overlap.start_time, overlap.end_time),
        409
      );
    }
    await pool
      .request()
      .input("scope", sql.NVarChar, body.scope)
      .input("scopeId", sql.Int, body.scopeId)
      .input("dow", sql.Int, body.dayOfWeek)
      .input("start", sql.NVarChar, startTime)
      .input("end", sql.NVarChar, endTime)
      .query(`
        INSERT INTO ${t("availability_rules")} (scope, scope_id, day_of_week, start_time, end_time)
        VALUES (@scope, @scopeId, @dow, @start, @end)
      `);
    return json({ ok: true }, 201);
  }
  if (segments[0] && req.method === "PUT") {
    return updateRule(parseInt(segments[0], 10), req, actor);
  }
  if (segments[0] && req.method === "DELETE") {
    const id = parseInt(segments[0], 10);
    if (actor.type === "office") {
      const check = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`SELECT scope, scope_id FROM ${t("availability_rules")} WHERE id = @id`);
      const row = check.recordset[0] as { scope: string; scope_id: unknown } | undefined;
      if (!row || !officeScopeMatches(actor, row.scope_id, row.scope)) {
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

async function updateRule(
  id: number,
  req: HttpRequest,
  actor: Actor
): Promise<HttpResponseInit> {
  const existing = await getRuleById(id);
  if (!existing) return error("Rule not found", 404);
  if (!enforceOfficeScope(actor, existing.scope_id, existing.scope)) {
    return error("Forbidden", 403);
  }

  const parsed = availabilityRuleUpdateSchema.safeParse(await req.json());
  if (!parsed.success) return error(zodFirstErrorMessage(parsed.error), 400);
  const body = parsed.data;

  const dayOfWeek = body.dayOfWeek ?? existing.day_of_week;
  const startTime = normalizeTimeHM(body.startTime ?? existing.start_time);
  const endTime = normalizeTimeHM(body.endTime ?? existing.end_time);

  const startMins =
    Number(startTime.split(":")[0]) * 60 + Number(startTime.split(":")[1]);
  const endMins = Number(endTime.split(":")[0]) * 60 + Number(endTime.split(":")[1]);
  if (endMins <= startMins) return error("End time must be after start time", 400);

  const overlap = await findOverlappingRule(
    existing.scope,
    existing.scope_id,
    dayOfWeek,
    startTime,
    endTime,
    id
  );
  if (overlap) {
    return error(
      overlapRuleMessage(overlap.day_of_week, overlap.start_time, overlap.end_time),
      409
    );
  }

  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.Int, id)
    .input("dow", sql.Int, dayOfWeek)
    .input("start", sql.NVarChar, startTime)
    .input("end", sql.NVarChar, endTime)
    .query(`
      UPDATE ${t("availability_rules")}
      SET day_of_week = @dow, start_time = @start, end_time = @end
      WHERE id = @id
    `);
  return json({ ok: true });
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
    const parsed = availabilityExceptionSchema.safeParse(await req.json());
    if (!parsed.success) return error(zodFirstErrorMessage(parsed.error), 400);
    const body = parsed.data;
    if (!enforceOfficeScope(actor, body.scopeId, body.scope)) {
      return error("Forbidden", 403);
    }
    if (await exceptionExists(body.scope, body.scopeId, body.exceptionDate)) {
      return error("That date is already marked as closed", 409);
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
      const row = check.recordset[0] as { scope: string; scope_id: unknown } | undefined;
      if (!row || !officeScopeMatches(actor, row.scope_id, row.scope)) {
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
    const parsed = availabilityBlockSchema.safeParse(await req.json());
    if (!parsed.success) return error(zodFirstErrorMessage(parsed.error), 400);
    const body = parsed.data;
    if (!enforceOfficeScope(actor, body.scopeId, body.scope)) {
      return error("Forbidden", 403);
    }
    const tz = await getOfficeTimezone(body.scopeId);
    const [y, m, d] = body.localDate.split("-").map(Number);
    const [sh, sm] = body.startTime.split(":").map(Number);
    const [eh, em] = body.endTime.split(":").map(Number);
    const startsAt = localTimeToUtc(y!, m!, d!, sh!, sm!, tz);
    const endsAt = localTimeToUtc(y!, m!, d!, eh!, em!, tz);

    const overlap = await findOverlappingBlock(body.scope, body.scopeId, startsAt, endsAt);
    if (overlap) {
      return error("This time block overlaps an existing block on that day", 409);
    }

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
      const row = check.recordset[0] as { scope: string; scope_id: unknown } | undefined;
      if (!row || !officeScopeMatches(actor, row.scope_id, row.scope)) {
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
