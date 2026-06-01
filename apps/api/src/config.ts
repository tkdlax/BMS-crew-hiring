function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const config = {
  sqlConnectionString: env("SQL_CONNECTION_STRING"),
  sendgridApiKey: env("SENDGRID_API_KEY"),
  sendgridFromEmail: env("SENDGRID_FROM_EMAIL"),
  twilioAccountSid: env("TWILIO_ACCOUNT_SID"),
  twilioAuthToken: env("TWILIO_AUTH_TOKEN"),
  twilioFromNumber: env("TWILIO_FROM_NUMBER"),
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
