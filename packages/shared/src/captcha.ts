export type CaptchaProvider = "turnstile" | "recaptcha";

/** Match site key to widget (Google reCAPTCHA keys usually start with 6L). */
export function resolveCaptchaProvider(
  siteKey: string,
  configured?: string
): CaptchaProvider {
  const cfg = configured?.trim().toLowerCase();
  if (cfg === "recaptcha" || cfg === "turnstile") return cfg;
  if (/^6L[\w-]+$/i.test(siteKey.trim())) return "recaptcha";
  return "turnstile";
}
