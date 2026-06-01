import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import sql from "mssql";
import { applicationSubmitSchema } from "@bms/shared";
import { getPool, t } from "../db/pool.js";
import { json, error } from "../http/response.js";
import { verifyCaptcha } from "../lib/captcha.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { processInvite } from "../services/invite.js";

export async function handleApplications(
  req: HttpRequest,
  _ctx: InvocationContext,
  segments: string[]
): Promise<HttpResponseInit> {
  if (segments.length === 0 && req.method === "POST") {
    return submitApplication(req);
  }
  return error("Not found", 404);
}

async function submitApplication(req: HttpRequest): Promise<HttpResponseInit> {
  const body = (await req.json()) as unknown;
  const parsed = applicationSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.message, 400);
  }
  const data = parsed.data;

  if (data.honeypot) {
    return error("Invalid submission", 400);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipOk = await checkRateLimit(`ip:${ip}`);
  const emailOk = await checkRateLimit(`email:${data.email.toLowerCase()}`);
  if (!ipOk || !emailOk) {
    return error("Too many requests. Please try again later.", 429);
  }

  const captchaOk = await verifyCaptcha(data.captchaToken, ip);
  if (!captchaOk) {
    return error("CAPTCHA verification failed", 400);
  }

  const pool = await getPool();
  const job = await pool
    .request()
    .input("officeSlug", sql.NVarChar, data.officeSlug)
    .input("jobSlug", sql.NVarChar, data.jobSlug)
    .query(`
      SELECT j.id AS job_id, o.id AS office_id
      FROM ${t("jobs")} j
      JOIN ${t("offices")} o ON o.id = j.office_id
      WHERE o.slug = @officeSlug AND j.slug = @jobSlug AND j.active = 1 AND o.active = 1
    `);

  if (job.recordset.length === 0) {
    return error("Job not found or inactive", 404);
  }

  const { job_id: jobId } = job.recordset[0] as { job_id: number };

  const insert = await pool
    .request()
    .input("jobId", sql.Int, jobId)
    .input("firstName", sql.NVarChar, data.firstName)
    .input("lastName", sql.NVarChar, data.lastName)
    .input("email", sql.NVarChar, data.email)
    .input("phone", sql.NVarChar, normalizePhone(data.phone))
    .input("custom", sql.NVarChar, JSON.stringify(data.customFields ?? {}))
    .query(`
      INSERT INTO ${t("applications")}
        (job_id, first_name, last_name, email, phone, custom_fields, status)
      OUTPUT INSERTED.id
      VALUES (@jobId, @firstName, @lastName, @email, @phone, @custom, 'submitted')
    `);

  const applicationId = insert.recordset[0].id as number;

  try {
    await processInvite(applicationId);
  } catch (e) {
    return json(
      {
        applicationId,
        warning:
          "Application saved but invite email could not be sent. Our team will follow up.",
        detail: e instanceof Error ? e.message : undefined,
      },
      201
    );
  }

  return json({ applicationId, status: "invited" }, 201);
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}
