import sql from "mssql";
import { config } from "../../config.js";
import { getPool, t } from "../../db/pool.js";

/** Office slug → SMS region code (matches TWILIO_FROM_NUMBER_{REGION} env vars). */
const OFFICE_SMS_REGION: Record<string, string> = {
  denver: "CO",
  "colorado-springs": "CO",
};

export function twilioFromNumberForRegion(region: string): string | undefined {
  return config.twilioFromByRegion[region.toUpperCase()];
}

export function twilioFromNumberForOfficeSlug(officeSlug: string): string {
  const region = OFFICE_SMS_REGION[officeSlug];
  if (region) {
    const regional = twilioFromNumberForRegion(region);
    if (regional) return regional;
  }
  if (config.twilioFromNumber) return config.twilioFromNumber;
  throw new Error(
    `No Twilio from number for office "${officeSlug}". Set TWILIO_FROM_NUMBER_${region ?? "CO"} or TWILIO_FROM_NUMBER.`
  );
}

export async function resolveTwilioFromNumber(officeId: number): Promise<string> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("id", sql.Int, officeId)
    .query(`SELECT slug FROM ${t("offices")} WHERE id = @id`);
  const slug = r.recordset[0]?.slug as string | undefined;
  if (!slug) {
    if (config.twilioFromNumber) return config.twilioFromNumber;
    throw new Error(`Office ${officeId} not found and no TWILIO_FROM_NUMBER fallback set.`);
  }
  return twilioFromNumberForOfficeSlug(slug);
}
