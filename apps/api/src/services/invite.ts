import sql from "mssql";
import type { MessageContext } from "@bms/shared";
import { config } from "../config.js";
import { getPool, t } from "../db/pool.js";
import { generateScheduleToken } from "../lib/tokens.js";
import { resolveScheduleConfig } from "../lib/resolveConfig.js";
import { sendMessage } from "../lib/messaging/sendMessage.js";

export async function processInvite(applicationId: number): Promise<string> {
  const pool = await getPool();
  const app = await pool.request().input("id", sql.Int, applicationId).query(`
    SELECT a.id, a.first_name, a.last_name, a.email, a.phone, a.status,
           j.id AS job_id, j.title AS job_title, j.slug AS job_slug,
           o.id AS office_id, o.name AS office_name, o.location_label, o.slug AS office_slug
    FROM ${t("applications")} a
    JOIN ${t("jobs")} j ON j.id = a.job_id
    JOIN ${t("offices")} o ON o.id = j.office_id
    WHERE a.id = @id
  `);
  if (app.recordset.length === 0) throw new Error("Application not found");
  const row = app.recordset[0] as Record<string, unknown>;

  const scheduleConfig = await resolveScheduleConfig(
    row.office_id as number,
    row.job_id as number
  );

  const token = generateScheduleToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + scheduleConfig.tokenExpiryDays);

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
  const ctx: MessageContext = {
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    jobTitle: row.job_title as string,
    officeName: row.office_name as string,
    officeLocation: row.location_label as string,
    scheduleUrl,
  };
  const scope = {
    officeId: row.office_id as number,
    jobId: row.job_id as number,
  };

  try {
    await sendMessage({
      templateKey: "application_received",
      channel: "email",
      to: { email: row.email as string },
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
    to: { email: row.email as string },
    context: ctx,
    scope,
    applicationId,
  });

  if (scheduleConfig.smsOnInvite) {
    await sendMessage({
      templateKey: "interview_invite",
      channel: "sms",
      to: { phone: row.phone as string },
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

  return scheduleUrl;
}
