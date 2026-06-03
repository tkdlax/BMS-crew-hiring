import sql from "mssql";
import { isWebhookEvent, parseOfficeWebhooks, type WebhookEvent } from "@bms/shared";
import { getPool, t } from "../db/pool.js";

export type WebhookPayload = {
  event: WebhookEvent;
  occurredAt: string;
  summary: string;
  [key: string]: unknown;
};

async function loadOfficeWebhookUrl(
  officeId: number,
  event: WebhookEvent
): Promise<string | null> {
  const pool = await getPool();
  const r = await pool.request().input("id", sql.Int, officeId).query(`
    SELECT webhooks_json FROM ${t("offices")} WHERE id = @id
  `);
  const row = r.recordset[0] as { webhooks_json?: string } | undefined;
  const webhooks = parseOfficeWebhooks(row?.webhooks_json);
  const url = webhooks[event]?.trim();
  if (url) return url;

  // Legacy fallback: global URL if office has no per-event URL configured.
  const global = await pool.request().query(`
    SELECT webhook_url, webhook_events_json FROM ${t("schedule_config")}
    WHERE scope = 'global' AND scope_id IS NULL
  `);
  const g = global.recordset[0] as
    | { webhook_url?: string; webhook_events_json?: string }
    | undefined;
  const legacyUrl = g?.webhook_url?.trim() ?? "";
  if (!legacyUrl) return null;
  try {
    const events = JSON.parse(g?.webhook_events_json ?? "[]") as string[];
    if (events.filter((e): e is WebhookEvent => isWebhookEvent(e)).includes(event)) {
      return legacyUrl;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function dispatchWebhook(
  event: WebhookEvent,
  officeId: number,
  payload: WebhookPayload
): Promise<void> {
  const url = await loadOfficeWebhookUrl(officeId, event);
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BMS-Crew-Hiring/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`Webhook ${event} office ${officeId} failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`Webhook ${event} office ${officeId} error:`, err);
  }
}
