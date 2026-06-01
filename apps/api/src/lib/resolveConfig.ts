import sql from "mssql";
import type { ReminderOffset, ScheduleConfigResolved } from "@bms/shared";
import { getPool, t } from "../db/pool.js";

const DEFAULT_OFFSETS: ReminderOffset[] = [
  { hoursBefore: 24, templateKeyEmail: "reminder_24h_email" },
  { hoursBefore: 2, templateKeySms: "reminder_2h_sms" },
];

interface ConfigRow {
  slot_duration_minutes: number;
  buffer_minutes: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  reminder_offsets_json: string;
  token_expiry_days: number;
  sms_on_invite: boolean;
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
      SELECT slot_duration_minutes, buffer_minutes, quiet_hours_start, quiet_hours_end,
             reminder_offsets_json, token_expiry_days, sms_on_invite
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
    buffer_minutes: 15,
    quiet_hours_start: "21:00",
    quiet_hours_end: "08:00",
    reminder_offsets_json: JSON.stringify(DEFAULT_OFFSETS),
    token_expiry_days: 14,
    sms_on_invite: false,
  };
  const b = { ...d, ...base, ...over };
  return b;
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
  const merged = mergeConfig(
    mergeConfig(global, office),
    job ?? null
  );
  let reminderOffsets: ReminderOffset[] = DEFAULT_OFFSETS;
  try {
    reminderOffsets = JSON.parse(merged.reminder_offsets_json) as ReminderOffset[];
  } catch {
    /* use default */
  }
  return {
    slotDurationMinutes: merged.slot_duration_minutes,
    bufferMinutes: merged.buffer_minutes,
    quietHoursStart: merged.quiet_hours_start,
    quietHoursEnd: merged.quiet_hours_end,
    reminderOffsets,
    tokenExpiryDays: merged.token_expiry_days,
    smsOnInvite: merged.sms_on_invite,
  };
}
