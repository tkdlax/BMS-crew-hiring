import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import sql from "mssql";
import { getPool, t } from "../db/pool.js";
import { json, error } from "../http/response.js";

export async function handlePublic(
  req: HttpRequest,
  _ctx: InvocationContext,
  segments: string[]
): Promise<HttpResponseInit> {
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
  return error("Not found", 404);
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
