/** Normalize URL/string env values (no trailing slash for API bases). */
export function normalizeApiBaseUrl(raw: string | undefined): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "undefined") return "";
  return trimmed.replace(/\/$/, "");
}

/** Build-time / local .env value (empty on Webflow static build). */
export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(import.meta.env.PUBLIC_API_BASE_URL);
}

/** Webflow Cloud / Cloudflare Worker runtime env. */
export function getRuntimeApiBaseUrl(locals: App.Locals): string {
  const runtimeEnv = locals.runtime?.env as Record<string, string | undefined> | undefined;
  return normalizeApiBaseUrl(runtimeEnv?.PUBLIC_API_BASE_URL) || getApiBaseUrl();
}

export function getRuntimeCaptchaSiteKey(locals: App.Locals): string {
  const runtimeEnv = locals.runtime?.env as Record<string, string | undefined> | undefined;
  const raw = runtimeEnv?.PUBLIC_CAPTCHA_SITE_KEY ?? import.meta.env.PUBLIC_CAPTCHA_SITE_KEY;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed && trimmed !== "undefined" ? trimmed : "";
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl().length > 0;
}
