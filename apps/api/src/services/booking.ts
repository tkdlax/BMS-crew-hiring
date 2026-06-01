import sql from "mssql";
import type { MessageContext } from "@bms/shared";
import { getPool, t } from "../db/pool.js";
import { resolveScheduleConfig } from "../lib/resolveConfig.js";
import { sendMessage } from "../lib/messaging/sendMessage.js";
import { formatInterviewTime } from "../lib/slots.js";

export async function confirmBooking(
  applicationId: number,
  officeId: number,
  jobId: number,
  startsAt: Date,
  endsAt: Date,
  applicantTimezone: string,
  officeTimezone: string
): Promise<void> {
  const pool = await getPool();
  const app = await pool.request().input("id", sql.Int, applicationId).query(`
    SELECT first_name, last_name, email, phone FROM ${t("applications")} WHERE id = @id
  `);
  const job = await pool.request().input("id", sql.Int, jobId).query(`
    SELECT title FROM ${t("jobs")} WHERE id = @id
  `);
  const office = await pool.request().input("id", sql.Int, officeId).query(`
    SELECT name, location_label FROM ${t("offices")} WHERE id = @id
  `);

  const a = app.recordset[0] as Record<string, string>;
  const j = job.recordset[0] as { title: string };
  const o = office.recordset[0] as { name: string; location_label: string };

  const interviewTimeLocal = formatInterviewTime(
    startsAt,
    applicantTimezone || officeTimezone
  );

  const ctx: MessageContext = {
    firstName: a.first_name,
    lastName: a.last_name,
    jobTitle: j.title,
    officeName: o.name,
    officeLocation: o.location_label,
    interviewTimeLocal,
  };
  const scope = { officeId, jobId };

  await sendMessage({
    templateKey: "booking_confirm_email",
    channel: "email",
    to: { email: a.email },
    context: ctx,
    scope,
    applicationId,
  });

  await sendMessage({
    templateKey: "booking_confirm_sms",
    channel: "sms",
    to: { phone: a.phone },
    context: ctx,
    scope,
    applicationId,
  });

  const scheduleConfig = await resolveScheduleConfig(officeId, jobId);
  const booking = await pool
    .request()
    .input("appId", sql.Int, applicationId)
    .query(`SELECT id FROM ${t("interview_bookings")} WHERE application_id = @appId`);

  const bookingId = booking.recordset[0].id as number;

  for (const offset of scheduleConfig.reminderOffsets) {
    const scheduledFor = new Date(
      startsAt.getTime() - offset.hoursBefore * 60 * 60 * 1000
    );
    if (offset.templateKeyEmail) {
      await pool
        .request()
        .input("bookingId", sql.Int, bookingId)
        .input("type", sql.NVarChar, offset.templateKeyEmail)
        .input("scheduledFor", sql.DateTime2, scheduledFor)
        .query(`
          MERGE ${t("reminder_jobs")} AS target
          USING (SELECT @bookingId AS booking_id, @type AS reminder_type) AS src
          ON target.booking_id = src.booking_id AND target.reminder_type = src.reminder_type
          WHEN NOT MATCHED THEN INSERT (booking_id, reminder_type, scheduled_for)
            VALUES (@bookingId, @type, @scheduledFor);
        `);
    }
    if (offset.templateKeySms) {
      await pool
        .request()
        .input("bookingId", sql.Int, bookingId)
        .input("type", sql.NVarChar, offset.templateKeySms)
        .input("scheduledFor", sql.DateTime2, scheduledFor)
        .query(`
          MERGE ${t("reminder_jobs")} AS target
          USING (SELECT @bookingId AS booking_id, @type AS reminder_type) AS src
          ON target.booking_id = src.booking_id AND target.reminder_type = src.reminder_type
          WHEN NOT MATCHED THEN INSERT (booking_id, reminder_type, scheduled_for)
            VALUES (@bookingId, @type, @scheduledFor);
        `);
    }
  }
}
