function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

function envTwilioByRegion(): Record<string, string> {
  const regions: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(/^TWILIO_FROM_NUMBER_([A-Z]{2})$/);
    if (match && value) regions[match[1]!] = value;
  }
  return regions;
}

export const config = {
  sqlConnectionString: env("SQL_CONNECTION_STRING"),
  sendgridApiKey: env("SENDGRID_API_KEY"),
  sendgridFromEmail: env("SENDGRID_FROM_EMAIL"),
  twilioAccountSid: env("TWILIO_ACCOUNT_SID"),
  twilioAuthToken: env("TWILIO_AUTH_TOKEN"),
  /** Fallback when no regional number matches the office. */
  twilioFromNumber: env("TWILIO_FROM_NUMBER"),
  /** e.g. CO → +1720..., UT → +1385... from TWILIO_FROM_NUMBER_CO / _UT */
  twilioFromByRegion: envTwilioByRegion(),
  captchaSecret: env("CAPTCHA_SECRET"),
  captchaProvider: env("CAPTCHA_PROVIDER", "turnstile") as "turnstile" | "recaptcha",
  adminPasswordHash: env("ADMIN_PASSWORD_HASH"),
  sessionSigningSecret: env("SESSION_SIGNING_SECRET"),
  allowedOrigins: env("ALLOWED_ORIGINS", "http://localhost:4321")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  publicSiteBaseUrl: env("PUBLIC_SITE_BASE_URL", "http://localhost:4321/hiring").replace(
    /\/$/,
    ""
  ),
  messagingDisabled: env("MESSAGING_DISABLED", "false") === "true",
  tablePrefix: "hire_",
};
