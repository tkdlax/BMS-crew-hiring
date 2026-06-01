import sql from "mssql";
import { getPool, t } from "../db/pool.js";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;

export async function checkRateLimit(key: string): Promise<boolean> {
  const pool = await getPool();
  const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS);

  const existing = await pool
    .request()
    .input("key", sql.NVarChar, key)
    .input("windowStart", sql.DateTime2, windowStart)
    .query(`
      SELECT hit_count FROM ${t("rate_limits")}
      WHERE limit_key = @key AND window_start = @windowStart
    `);

  if (existing.recordset.length === 0) {
    await pool
      .request()
      .input("key", sql.NVarChar, key)
      .input("windowStart", sql.DateTime2, windowStart)
      .query(`
        INSERT INTO ${t("rate_limits")} (limit_key, window_start, hit_count)
        VALUES (@key, @windowStart, 1)
      `);
    return true;
  }

  const count = existing.recordset[0].hit_count as number;
  if (count >= MAX_PER_WINDOW) return false;

  await pool
    .request()
    .input("key", sql.NVarChar, key)
    .input("windowStart", sql.DateTime2, windowStart)
    .query(`
      UPDATE ${t("rate_limits")} SET hit_count = hit_count + 1
      WHERE limit_key = @key AND window_start = @windowStart
    `);
  return true;
}
