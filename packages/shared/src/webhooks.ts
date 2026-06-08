/** Events that can trigger an outbound webhook (manager notifications). */
export const WEBHOOK_EVENTS = [
  "application_submitted",
  "interview_scheduled",
  "interview_rescheduled",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Per-office webhook URLs keyed by event type. */
export type OfficeWebhooks = Partial<Record<WebhookEvent, string>>;

export function parseOfficeWebhooks(json: string | null | undefined): OfficeWebhooks {
  if (!json?.trim()) return {};
  try {
    const parsed = JSON.parse(json) as Record<string, string>;
    const out: OfficeWebhooks = {};
    for (const event of WEBHOOK_EVENTS) {
      const url = parsed[event]?.trim();
      if (url) out[event] = url;
    }
    return out;
  } catch {
    return {};
  }
}

export function isWebhookEvent(value: string): value is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}
