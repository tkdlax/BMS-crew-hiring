import sgMail from "@sendgrid/mail";
import twilio from "twilio";
import sql from "mssql";
import { renderTemplate, type MessageChannel, type MessageContext } from "@bms/shared";
import { config } from "../../config.js";
import { getPool, t } from "../../db/pool.js";
import { resolveTemplate } from "./resolveTemplate.js";

export interface SendMessageParams {
  templateKey: string;
  channel: MessageChannel;
  to: { email?: string; phone?: string };
  context: MessageContext;
  scope: { officeId: number; jobId: number };
  applicationId?: number;
}

if (config.sendgridApiKey) {
  sgMail.setApiKey(config.sendgridApiKey);
}

export async function sendMessage(params: SendMessageParams): Promise<void> {
  const tpl = await resolveTemplate(
    params.templateKey,
    params.channel,
    params.scope
  );
  if (!tpl) {
    throw new Error(`Template not found: ${params.templateKey} (${params.channel})`);
  }

  const body = renderTemplate(tpl.body, params.context);
  const subject = tpl.subject
    ? renderTemplate(tpl.subject, params.context)
    : "";

  let status = "sent";
  let providerId: string | null = null;
  let errorMessage: string | null = null;

  try {
    if (config.messagingDisabled) {
      status = "skipped";
      providerId = "dev-disabled";
    } else if (params.channel === "email") {
      if (!params.to.email) throw new Error("Email recipient required");
      const [res] = await sgMail.send({
        to: params.to.email,
        from: config.sendgridFromEmail,
        subject,
        text: body,
        html: body.replace(/\n/g, "<br>"),
      });
      providerId = res?.headers?.["x-message-id"] ?? null;
    } else {
      if (!params.to.phone) throw new Error("Phone recipient required");
      const client = twilio(config.twilioAccountSid, config.twilioAuthToken);
      const msg = await client.messages.create({
        to: params.to.phone,
        from: config.twilioFromNumber,
        body,
      });
      providerId = msg.sid;
    }
  } catch (e) {
    status = "failed";
    errorMessage = e instanceof Error ? e.message : String(e);
    await logOutbound(params, status, providerId, errorMessage);
    throw e;
  }

  await logOutbound(params, status, providerId, errorMessage);
}

async function logOutbound(
  params: SendMessageParams,
  status: string,
  providerId: string | null,
  errorMessage: string | null
): Promise<void> {
  const pool = await getPool();
  const recipient =
    params.channel === "email" ? params.to.email! : params.to.phone!;
  await pool
    .request()
    .input("appId", sql.Int, params.applicationId ?? null)
    .input("officeId", sql.Int, params.scope.officeId)
    .input("templateKey", sql.NVarChar, params.templateKey)
    .input("channel", sql.NVarChar, params.channel)
    .input("recipient", sql.NVarChar, recipient)
    .input("status", sql.NVarChar, status)
    .input("providerId", sql.NVarChar, providerId)
    .input("error", sql.NVarChar, errorMessage)
    .query(`
      INSERT INTO ${t("outbound_messages")}
        (application_id, office_id, template_key, channel, recipient, status, provider_id, error_message)
      VALUES (@appId, @officeId, @templateKey, @channel, @recipient, @status, @providerId, @error)
    `);
}
