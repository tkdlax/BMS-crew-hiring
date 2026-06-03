import sql from "mssql";
import { config } from "../config.js";
import { getPool, t } from "../db/pool.js";
import { resolveScheduleConfig } from "../lib/resolveConfig.js";
import { sendMessage } from "../lib/messaging/sendMessage.js";
import {
  buildInterviewScheduledSummary,
  buildMessageContext,
  interviewTimeForBooking,
  loadApplicationRow,
  getScheduleTokenForApplication,
} from "../lib/applicationContext.js";
import { dispatchWebhook } from "../lib/webhooks.js";

export async function confirmBooking(
  applicationId: number,
  officeId: number,
  jobId: number,
  startsAt: Date,
  endsAt: Date,
  applicantTimezone: string,
  officeTimezone: string
): Promise<void> {
  const app = await loadApplicationRow(applicationId);
  if (!app) throw new Error("Application not found");

  const interviewTimeLocal = interviewTimeForBooking(
    startsAt,
    applicantTimezone,
    officeTimezone
  );

  const scheduleToken = await getScheduleTokenForApplication(applicationId);
  const confirmationUrl = scheduleToken
    ? `${config.publicSiteBaseUrl}/schedule/?token=${scheduleToken}`
    : undefined;

  const ctx = buildMessageContext(app, {
    interviewTimeLocal,
    confirmationUrl,
  });
  const scope = { officeId, jobId };

  await sendMessage({
    templateKey: "booking_confirm_email",
    channel: "email",
    to: { email: app.email },
    context: ctx,
    scope,
    applicationId,
  });

  await sendMessage({
    templateKey: "booking_confirm_sms",
    channel: "sms",
    to: { phone: app.phone },
    context: ctx,
    scope,
    applicationId,
  });

  const scheduleConfig = await resolveScheduleConfig(officeId, jobId);
  const pool = await getPool();
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

  await dispatchWebhook("interview_scheduled", app.officeId, {
    event: "interview_scheduled",
    occurredAt: new Date().toISOString(),
    summary: buildInterviewScheduledSummary(app, interviewTimeLocal),
    application: {
      id: app.applicationId,
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email,
      phone: app.phone,
      primaryInterest: app.primaryInterest,
      customFields: app.customFields,
      status: "scheduled",
      submittedAt: app.submittedAt,
    },
    job: { id: app.jobId, title: app.jobTitle, slug: app.jobSlug },
    office: {
      id: app.officeId,
      name: app.officeName,
      slug: app.officeSlug,
      locationLabel: app.officeLocation,
    },
    booking: {
      id: bookingId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      interviewTimeLocal,
      applicantTimezone,
    },
    confirmationUrl,
  });
}
