import sql from "mssql";
import type { MessageContext } from "@bms/shared";
import { getPool, t } from "../db/pool.js";
import { formatInterviewTime } from "./slots.js";

export type ApplicationRow = {
  applicationId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  customFields: Record<string, string>;
  primaryInterest: string;
  submittedAt: string;
  jobId: number;
  jobTitle: string;
  jobSlug: string;
  officeId: number;
  officeName: string;
  officeSlug: string;
  officeLocation: string;
  officeLocationNotes: string;
  officeTimezone: string;
};

export async function loadApplicationRow(
  applicationId: number
): Promise<ApplicationRow | null> {
  const pool = await getPool();
  const r = await pool.request().input("id", sql.Int, applicationId).query(`
    SELECT a.id AS application_id, a.first_name, a.last_name, a.email, a.phone, a.status,
           a.custom_fields, a.created_at,
           j.id AS job_id, j.title AS job_title, j.slug AS job_slug,
           o.id AS office_id, o.name AS office_name, o.slug AS office_slug,
           o.location_label, o.location_notes, o.timezone AS office_timezone
    FROM ${t("applications")} a
    JOIN ${t("jobs")} j ON j.id = a.job_id
    JOIN ${t("offices")} o ON o.id = j.office_id
    WHERE a.id = @id
  `);
  if (r.recordset.length === 0) return null;
  const row = r.recordset[0] as Record<string, unknown>;
  let customFields: Record<string, string> = {};
  try {
    customFields = row.custom_fields
      ? (JSON.parse(row.custom_fields as string) as Record<string, string>)
      : {};
  } catch {
    customFields = {};
  }
  const primaryInterest =
    customFields.primaryInterest?.trim() ||
    customFields.interest?.trim() ||
    "";

  return {
    applicationId: row.application_id as number,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    phone: row.phone as string,
    status: row.status as string,
    customFields,
    primaryInterest,
    submittedAt: new Date(row.created_at as string).toISOString(),
    jobId: row.job_id as number,
    jobTitle: row.job_title as string,
    jobSlug: row.job_slug as string,
    officeId: row.office_id as number,
    officeName: row.office_name as string,
    officeSlug: row.office_slug as string,
    officeLocation: row.location_label as string,
    officeLocationNotes: (row.location_notes as string | null) ?? "",
    officeTimezone: row.office_timezone as string,
  };
}

export function buildMessageContext(
  app: ApplicationRow,
  extras: Partial<MessageContext> = {}
): MessageContext {
  return {
    firstName: app.firstName,
    lastName: app.lastName,
    email: app.email,
    phone: app.phone,
    jobTitle: app.jobTitle,
    officeName: app.officeName,
    officeLocation: app.officeLocation,
    locationNotes: app.officeLocationNotes,
    primaryInterest: app.primaryInterest || "Not specified",
    submittedAt: app.submittedAt,
    ...extras,
  };
}

export function buildApplicationSubmittedSummary(app: ApplicationRow): string {
  return [
    "New Applicant from the Website.",
    `Name: ${app.firstName} ${app.lastName}`,
    `Email: ${app.email}`,
    `Phone: ${app.phone}`,
    `Interested in: ${app.primaryInterest || "Not specified"}`,
    "Resume Link (if any):",
    `Date Submitted: ${app.submittedAt}`,
    "They've received a text message encouraging them to set up a time directly online or to schedule with HR.",
  ].join("\n");
}

export function buildInterviewScheduledSummary(
  app: ApplicationRow,
  interviewTimeLocal: string
): string {
  return [
    "New Mover / Packer Interview Scheduled",
    `Name: ${app.firstName} ${app.lastName}`,
    `Date: ${interviewTimeLocal}`,
    `Email: ${app.email}`,
    `Phone: ${app.phone}`,
    `Interest: ${app.primaryInterest || "Not specified"}`,
    "This interview was self-scheduled by the Applicant. Please reach out if this needs to be rescheduled.",
  ].join("\n");
}

export async function getScheduleTokenForApplication(
  applicationId: number
): Promise<string | null> {
  const pool = await getPool();
  const r = await pool.request().input("appId", sql.Int, applicationId).query(`
    SELECT TOP 1 token FROM ${t("application_tokens")}
    WHERE application_id = @appId AND purpose = 'schedule'
    ORDER BY created_at DESC
  `);
  return (r.recordset[0] as { token?: string } | undefined)?.token ?? null;
}

export function interviewTimeForBooking(
  startsAt: Date,
  applicantTimezone: string,
  officeTimezone: string
): string {
  return formatInterviewTime(startsAt, applicantTimezone || officeTimezone);
}
