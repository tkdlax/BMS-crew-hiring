import sql from "mssql";
import { getPool, t } from "../db/pool.js";

export type CalendarEventRow = {
  id: number;
  startsAt: string;
  endsAt: string;
  firstName: string;
  lastName: string;
  primaryInterest: string;
  jobTitle: string;
  status: string;
  applicationId: number;
};

function parsePrimaryInterest(customFieldsJson: string | null): string {
  if (!customFieldsJson?.trim()) return "";
  try {
    const cf = JSON.parse(customFieldsJson) as Record<string, string>;
    return cf.primaryInterest?.trim() || cf.interest?.trim() || "";
  } catch {
    return "";
  }
}

export async function listCalendarEvents(
  officeId: number,
  from: Date,
  to: Date
): Promise<CalendarEventRow[]> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("officeId", sql.Int, officeId)
    .input("from", sql.DateTime2, from)
    .input("to", sql.DateTime2, to)
    .query(`
      SELECT b.id, b.starts_at, b.ends_at, b.status AS booking_status,
             a.id AS application_id, a.first_name, a.last_name, a.status AS app_status,
             a.custom_fields, j.title AS job_title
      FROM ${t("interview_bookings")} b
      JOIN ${t("applications")} a ON a.id = b.application_id
      JOIN ${t("jobs")} j ON j.id = a.job_id
      WHERE b.office_id = @officeId
        AND b.starts_at >= @from
        AND b.starts_at < @to
      ORDER BY b.starts_at ASC
    `);

  return r.recordset.map((row: Record<string, unknown>) => ({
    id: row.id as number,
    startsAt: new Date(row.starts_at as string).toISOString(),
    endsAt: new Date(row.ends_at as string).toISOString(),
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    primaryInterest: parsePrimaryInterest(row.custom_fields as string | null),
    jobTitle: row.job_title as string,
    status: (row.app_status as string) || (row.booking_status as string),
    applicationId: row.application_id as number,
  }));
}
