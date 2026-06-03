import sql from "mssql";
import type { MessageContext } from "@bms/shared";
import { config as appConfig } from "../config.js";
import { getPool, t } from "../db/pool.js";
import { getScheduleTokenForApplication } from "../lib/applicationContext.js";
import { resolveScheduleConfig } from "../lib/resolveConfig.js";
import { isInQuietHours, nextAllowedSendTime } from "../lib/quietHours.js";
import { sendMessage } from "../lib/messaging/sendMessage.js";
import { formatInterviewTime } from "../lib/slots.js";

export async function processDueReminders(): Promise<number> {
  const pool = await getPool();
  const due = await pool.request().query(`
    SELECT rj.id, rj.booking_id, rj.reminder_type, rj.scheduled_for, rj.retry_count,
           b.starts_at, b.applicant_timezone,
           a.id AS application_id, a.first_name, a.last_name, a.email, a.phone, a.custom_fields,
           j.id AS job_id, j.title AS job_title,
           o.id AS office_id, o.name AS office_name, o.location_label, o.location_notes, o.timezone AS office_timezone
    FROM ${t("reminder_jobs")} rj
    JOIN ${t("interview_bookings")} b ON b.id = rj.booking_id
    JOIN ${t("applications")} a ON a.id = b.application_id
    JOIN ${t("jobs")} j ON j.id = a.job_id
    JOIN ${t("offices")} o ON o.id = b.office_id
    WHERE rj.sent_at IS NULL AND rj.scheduled_for <= SYSUTCDATETIME()
  `);

  let processed = 0;
  for (const row of due.recordset as Record<string, unknown>[]) {
    const officeId = row.office_id as number;
    const jobId = row.job_id as number;
    const scheduleConfig = await resolveScheduleConfig(officeId, jobId);
    const now = new Date();

    if (
      isInQuietHours(
        now,
        row.office_timezone as string,
        scheduleConfig.quietHoursStart,
        scheduleConfig.quietHoursEnd
      )
    ) {
      const next = nextAllowedSendTime(
        now,
        row.office_timezone as string,
        scheduleConfig.quietHoursStart,
        scheduleConfig.quietHoursEnd
      );
      await pool
        .request()
        .input("id", sql.Int, row.id)
        .input("next", sql.DateTime2, next)
        .query(`
          UPDATE ${t("reminder_jobs")} SET scheduled_for = @next WHERE id = @id
        `);
      continue;
    }

    const startsAt = new Date(row.starts_at as string);
    const interviewTimeLocal = formatInterviewTime(
      startsAt,
      (row.applicant_timezone as string) || (row.office_timezone as string)
    );

    let primaryInterest = "";
    try {
      const cf = row.custom_fields
        ? (JSON.parse(row.custom_fields as string) as Record<string, string>)
        : {};
      primaryInterest = cf.primaryInterest?.trim() || cf.interest?.trim() || "";
    } catch {
      primaryInterest = "";
    }

    const appId = row.application_id as number;
    const scheduleToken = await getScheduleTokenForApplication(appId);
    const confirmationUrl = scheduleToken
      ? `${appConfig.publicSiteBaseUrl}/schedule/?token=${scheduleToken}`
      : "";

    const ctx: MessageContext = {
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      jobTitle: row.job_title as string,
      officeName: row.office_name as string,
      officeLocation: row.location_label as string,
      locationNotes: (row.location_notes as string | null) ?? "",
      interviewTimeLocal,
      primaryInterest: primaryInterest || "Not specified",
      confirmationUrl,
    };
    const scope = { officeId, jobId };
    const reminderType = row.reminder_type as string;
    const channel = reminderType.endsWith("_sms") ? "sms" : "email";

    try {
      await sendMessage({
        templateKey: reminderType,
        channel,
        to:
          channel === "email"
            ? { email: row.email as string }
            : { phone: row.phone as string },
        context: ctx,
        scope,
        applicationId: row.application_id as number,
      });
      await pool
        .request()
        .input("id", sql.Int, row.id)
        .query(`
          UPDATE ${t("reminder_jobs")} SET sent_at = SYSUTCDATETIME() WHERE id = @id
        `);
      processed++;
    } catch {
      const retryCount = (row.retry_count as number) + 1;
      const backoff = new Date(Date.now() + 15 * 60 * 1000);
      await pool
        .request()
        .input("id", sql.Int, row.id)
        .input("retry", sql.Int, retryCount)
        .input("backoff", sql.DateTime2, backoff)
        .query(`
          UPDATE ${t("reminder_jobs")}
          SET retry_count = @retry, scheduled_for = @backoff
          WHERE id = @id
        `);
    }
  }
  return processed;
}
