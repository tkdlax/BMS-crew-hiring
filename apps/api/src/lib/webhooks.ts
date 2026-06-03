import sql from "mssql";
import { isWebhookEvent, type WebhookEvent } from "@bms/shared";
import { getPool, t } from "../db/pool.js";

export type WebhookPayload = {
  event: WebhookEvent;
  occurredAt: string;
  summary: string;
  [key: string]: unknown;
};

async function loadWebhookConfig(): Promise<{
  url: string;
  events: WebhookEvent[];
}> {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT webhook_url, webhook_events_json FROM ${t("schedule_config")}
    WHERE scope = 'global' AND scope_id IS NULL
  `);
  const row = r.recordset[0] as
    | { webhook_url?: string; webhook_events_json?: string }
    | undefined;
  const url = row?.webhook_url?.trim() ?? "";
  let events: WebhookEvent[] = [];
  try {
    const parsed = JSON.parse(row?.webhook_events_json ?? "[]") as string[];
    events = parsed.filter((e): e is WebhookEvent => isWebhookEvent(e));
  } catch {
    events = [];
  }
  return { url, events };
}

export async function dispatchWebhook(
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const { url, events } = await loadWebhookConfig();
  if (!url || !events.includes(event)) return;

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
      console.error(`Webhook ${event} failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`Webhook ${event} error:`, err);
  }
}
