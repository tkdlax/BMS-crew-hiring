import sql from "mssql";
import type { ReminderOffset, ScheduleConfigResolved } from "@bms/shared";
import { DEFAULT_SLOT_CAPACITY, isWebhookEvent } from "@bms/shared";
import { getPool, t } from "../db/pool.js";

const DEFAULT_OFFSETS: ReminderOffset[] = [
  { hoursBefore: 24, templateKeyEmail: "reminder_24h_email" },
  { hoursBefore: 2, templateKeySms: "reminder_2h_sms" },
];

interface ConfigRow {
  slot_duration_minutes: number;
  buffer_minutes: number;
  slot_capacity?: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  reminder_offsets_json: string;
  token_expiry_days: number;
  sms_on_invite: boolean;
  booking_window_days?: number;
  min_notice_hours?: number;
  webhook_url?: string | null;
  webhook_events_json?: string | null;
}

async function fetchConfig(
  scope: string,
  scopeId: number | null
): Promise<ConfigRow | null> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("scope", sql.NVarChar, scope)
    .input("scopeId", sql.Int, scopeId)
    .query(`
      SELECT slot_duration_minutes, buffer_minutes, slot_capacity, quiet_hours_start, quiet_hours_end,
             reminder_offsets_json, token_expiry_days, sms_on_invite,
             booking_window_days, min_notice_hours, webhook_url, webhook_events_json
      FROM ${t("schedule_config")}
      WHERE scope = @scope AND ((@scopeId IS NULL AND scope_id IS NULL) OR scope_id = @scopeId)
    `);
  return (r.recordset[0] as ConfigRow) ?? null;
}

function mergeConfig(
  base: ConfigRow | null,
  over: ConfigRow | null
): ConfigRow {
  const d: ConfigRow = {
    slot_duration_minutes: 30,
    buffer_minutes: 0,
    slot_capacity: DEFAULT_SLOT_CAPACITY,
    quiet_hours_start: "21:00",
    quiet_hours_end: "08:00",
    reminder_offsets_json: JSON.stringify(DEFAULT_OFFSETS),
    token_expiry_days: 14,
    sms_on_invite: false,
    booking_window_days: 7,
    min_notice_hours: 8,
    webhook_url: null,
    webhook_events_json: JSON.stringify(["application_submitted", "interview_scheduled"]),
  };
  return { ...d, ...base, ...over };
}

function parseWebhookEvents(json: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(json ?? "[]") as string[];
    return parsed.filter((e) => isWebhookEvent(e));
  } catch {
    return ["application_submitted", "interview_scheduled"];
  }
}

export async function resolveScheduleConfig(
  officeId: number,
  jobId: number
): Promise<ScheduleConfigResolved> {
  const [global, office, job] = await Promise.all([
    fetchConfig("global", null),
    fetchConfig("office", officeId),
    fetchConfig("job", jobId),
  ]);
  const merged = mergeConfig(mergeConfig(global, office), job ?? null);
  let reminderOffsets: ReminderOffset[] = DEFAULT_OFFSETS;
  try {
    reminderOffsets = JSON.parse(merged.reminder_offsets_json) as ReminderOffset[];
  } catch {
    /* use default */
  }
  const webhookUrl = merged.webhook_url?.trim() || undefined;
  return {
    slotDurationMinutes: merged.slot_duration_minutes,
    bufferMinutes: merged.buffer_minutes,
    slotCapacity: merged.slot_capacity ?? DEFAULT_SLOT_CAPACITY,
    quietHoursStart: merged.quiet_hours_start,
    quietHoursEnd: merged.quiet_hours_end,
    reminderOffsets,
    tokenExpiryDays: merged.token_expiry_days,
    smsOnInvite: !!(
      global?.sms_on_invite || office?.sms_on_invite || job?.sms_on_invite
    ),
    bookingWindowDays: merged.booking_window_days ?? 7,
    minNoticeHours: merged.min_notice_hours ?? 8,
    webhookUrl,
    webhookEvents: parseWebhookEvents(merged.webhook_events_json),
  };
}
