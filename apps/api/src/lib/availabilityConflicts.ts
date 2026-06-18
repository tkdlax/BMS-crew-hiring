import sql from "mssql";
import { timeRangesOverlap, normalizeTimeHM } from "@bms/shared";
import { getPool, t } from "../db/pool.js";

export type RuleRow = {
  id: number;
  scope: string;
  scope_id: number | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export async function getRuleById(id: number): Promise<RuleRow | null> {
  const pool = await getPool();
  const r = await pool.request().input("id", sql.Int, id).query(`
    SELECT id, scope, scope_id, day_of_week, start_time, end_time
    FROM ${t("availability_rules")} WHERE id = @id
  `);
  const row = r.recordset[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as number,
    scope: row.scope as string,
    scope_id: row.scope_id as number | null,
    day_of_week: row.day_of_week as number,
    start_time: normalizeTimeHM(String(row.start_time)),
    end_time: normalizeTimeHM(String(row.end_time)),
  };
}

export async function findOverlappingRule(
  scope: string,
  scopeId: number | null,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: number
): Promise<RuleRow | null> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("scope", sql.NVarChar, scope)
    .input("scopeId", sql.Int, scopeId)
    .input("dow", sql.Int, dayOfWeek)
    .query(`
      SELECT id, scope, scope_id, day_of_week, start_time, end_time
      FROM ${t("availability_rules")}
      WHERE scope = @scope
        AND ((@scopeId IS NULL AND scope_id IS NULL) OR scope_id = @scopeId)
        AND day_of_week = @dow
    `);
  for (const row of r.recordset as Record<string, unknown>[]) {
    if (excludeId && (row.id as number) === excludeId) continue;
    const start = normalizeTimeHM(String(row.start_time));
    const end = normalizeTimeHM(String(row.end_time));
    if (timeRangesOverlap(startTime, endTime, start, end)) {
      return {
        id: row.id as number,
        scope: row.scope as string,
        scope_id: row.scope_id as number | null,
        day_of_week: row.day_of_week as number,
        start_time: start,
        end_time: end,
      };
    }
  }
  return null;
}

export async function exceptionExists(
  scope: string,
  scopeId: number,
  exceptionDate: string
): Promise<boolean> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("scope", sql.NVarChar, scope)
    .input("scopeId", sql.Int, scopeId)
    .input("date", sql.Date, exceptionDate)
    .query(`
      SELECT 1 AS x FROM ${t("availability_exceptions")}
      WHERE scope = @scope AND scope_id = @scopeId AND exception_date = @date
    `);
  return r.recordset.length > 0;
}

export async function findOverlappingBlock(
  scope: string,
  scopeId: number,
  startsAt: Date,
  endsAt: Date
): Promise<{ id: number } | null> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("scope", sql.NVarChar, scope)
    .input("scopeId", sql.Int, scopeId)
    .input("starts", sql.DateTime2, startsAt)
    .input("ends", sql.DateTime2, endsAt)
    .query(`
      SELECT id FROM ${t("availability_blocks")}
      WHERE scope = @scope AND scope_id = @scopeId
        AND starts_at < @ends AND ends_at > @starts
    `);
  const row = r.recordset[0] as { id: number } | undefined;
  return row ? { id: row.id } : null;
}
