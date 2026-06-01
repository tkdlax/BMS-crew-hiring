import sql from "mssql";
import { getPool, t } from "../../db/pool.js";
import type { MessageChannel } from "@bms/shared";

export interface ResolvedTemplate {
  subject: string | null;
  body: string;
}

export async function resolveTemplate(
  templateKey: string,
  channel: MessageChannel,
  scope: { officeId: number; jobId: number }
): Promise<ResolvedTemplate | null> {
  const pool = await getPool();
  const attempts: Array<{ scope: string; scopeId: number | null }> = [
    { scope: "job", scopeId: scope.jobId },
    { scope: "office", scopeId: scope.officeId },
    { scope: "global", scopeId: null },
  ];

  for (const a of attempts) {
    const r = await pool
      .request()
      .input("key", sql.NVarChar, templateKey)
      .input("channel", sql.NVarChar, channel)
      .input("scope", sql.NVarChar, a.scope)
      .input("scopeId", sql.Int, a.scopeId)
      .query(`
        SELECT subject, body FROM ${t("message_templates")}
        WHERE template_key = @key AND channel = @channel AND scope = @scope
          AND ((@scopeId IS NULL AND scope_id IS NULL) OR scope_id = @scopeId)
      `);
    if (r.recordset.length > 0) {
      const row = r.recordset[0] as { subject: string | null; body: string };
      return { subject: row.subject, body: row.body };
    }
  }
  return null;
}
