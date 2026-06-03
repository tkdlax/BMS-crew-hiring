import sql from "mssql";
import { config } from "../config.js";
import { getPool, t } from "../db/pool.js";
import { generateScheduleToken } from "../lib/tokens.js";
import { resolveScheduleConfig } from "../lib/resolveConfig.js";
import { sendMessage } from "../lib/messaging/sendMessage.js";
import {
  buildApplicationSubmittedSummary,
  buildMessageContext,
  loadApplicationRow,
} from "../lib/applicationContext.js";
import { dispatchWebhook } from "../lib/webhooks.js";

export async function processInvite(applicationId: number): Promise<string> {
  const app = await loadApplicationRow(applicationId);
  if (!app) throw new Error("Application not found");

  const scheduleConfig = await resolveScheduleConfig(app.officeId, app.jobId);

  const token = generateScheduleToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + scheduleConfig.tokenExpiryDays);

  const pool = await getPool();
  await pool
    .request()
    .input("appId", sql.Int, applicationId)
    .input("token", sql.NVarChar, token)
    .input("expires", sql.DateTime2, expiresAt)
    .query(`
      INSERT INTO ${t("application_tokens")} (application_id, token, purpose, expires_at)
      VALUES (@appId, @token, 'schedule', @expires)
    `);

  const scheduleUrl = `${config.publicSiteBaseUrl}/schedule/?token=${token}`;
  const ctx = buildMessageContext(app, { scheduleUrl });
  const scope = { officeId: app.officeId, jobId: app.jobId };

  try {
    await sendMessage({
      templateKey: "application_received",
      channel: "email",
      to: { email: app.email },
      context: ctx,
      scope,
      applicationId,
    });
  } catch {
    /* optional template */
  }

  await sendMessage({
    templateKey: "interview_invite",
    channel: "email",
    to: { email: app.email },
    context: ctx,
    scope,
    applicationId,
  });

  if (scheduleConfig.smsOnInvite) {
    await sendMessage({
      templateKey: "interview_invite",
      channel: "sms",
      to: { phone: app.phone },
      context: ctx,
      scope,
      applicationId,
    });
  }

  await pool
    .request()
    .input("id", sql.Int, applicationId)
    .query(`
      UPDATE ${t("applications")} SET status = 'invited', updated_at = SYSUTCDATETIME()
      WHERE id = @id
    `);

  await dispatchWebhook("application_submitted", {
    event: "application_submitted",
    occurredAt: new Date().toISOString(),
    summary: buildApplicationSubmittedSummary(app),
    application: {
      id: app.applicationId,
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email,
      phone: app.phone,
      primaryInterest: app.primaryInterest,
      customFields: app.customFields,
      status: "invited",
      submittedAt: app.submittedAt,
    },
    job: { id: app.jobId, title: app.jobTitle, slug: app.jobSlug },
    office: {
      id: app.officeId,
      name: app.officeName,
      slug: app.officeSlug,
      locationLabel: app.officeLocation,
    },
    scheduleUrl,
  });

  return scheduleUrl;
}
