/** Events that can trigger an outbound webhook (manager notifications). */
export const WEBHOOK_EVENTS = [
  "application_submitted",
  "interview_scheduled",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function isWebhookEvent(value: string): value is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}
