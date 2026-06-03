import { getApiBaseUrl, normalizeApiBaseUrl } from "./api";

/** Same-origin config endpoint (Webflow runtime env). */
export function getPublicConfigUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return `${withSlash}api/public-config`;
}

import type { CaptchaProvider } from "./captcha.js";
import { resolveCaptchaProvider } from "./captcha.js";

type PublicConfig = {
  apiBaseUrl?: string;
  captchaSiteKey?: string;
  captchaProvider?: CaptchaProvider;
};

let cachedConfig: PublicConfig | undefined;

async function loadPublicConfig(): Promise<PublicConfig> {
  if (cachedConfig !== undefined) return cachedConfig;

  const buildApi = getApiBaseUrl();
  const buildCaptcha = import.meta.env.PUBLIC_CAPTCHA_SITE_KEY?.trim() ?? "";

  // On Webflow Cloud the API URL may be baked at build time while CAPTCHA keys are runtime-only.
  // Always prefer /api/public-config in the browser when available.
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(getPublicConfigUrl());
      if (res.ok) {
        const data = (await res.json()) as PublicConfig;
        const captchaSiteKey = data.captchaSiteKey?.trim() || buildCaptcha;
        cachedConfig = {
          apiBaseUrl: normalizeApiBaseUrl(data.apiBaseUrl) || buildApi,
          captchaSiteKey,
          captchaProvider:
            data.captchaProvider ??
            resolveCaptchaProvider(captchaSiteKey, import.meta.env.PUBLIC_CAPTCHA_PROVIDER),
        };
        return cachedConfig;
      }
    } catch {
      /* fall through to build-time values */
    }
  }

  cachedConfig = {
    apiBaseUrl: buildApi,
    captchaSiteKey: buildCaptcha,
    captchaProvider: resolveCaptchaProvider(buildCaptcha, import.meta.env.PUBLIC_CAPTCHA_PROVIDER),
  };
  return cachedConfig;
}

export async function resolveApiBaseUrl(): Promise<string> {
  const cfg = await loadPublicConfig();
  return cfg.apiBaseUrl ?? "";
}

export async function resolveCaptchaSiteKey(): Promise<string> {
  const cfg = await loadPublicConfig();
  return cfg.captchaSiteKey ?? "";
}

export async function resolveCaptchaProviderFromConfig(): Promise<CaptchaProvider> {
  const cfg = await loadPublicConfig();
  const siteKey = cfg.captchaSiteKey ?? "";
  return cfg.captchaProvider ?? resolveCaptchaProvider(siteKey);
}

/** Same-origin admin API (proxied to Azure on the server — avoids browser CORS). */
export function getAdminApiBaseUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return `${withSlash}api/admin`;
}

/** Same-origin applicant API (proxied to Azure — avoids cross-origin preflight on POST). */
export function getHireApiBaseUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return `${withSlash}api/hire`;
}

/** Resolves when the Azure backend is configured; returns the browser-facing hire base URL. */
export async function resolveHireApiBaseUrl(): Promise<string> {
  const azure = await resolveApiBaseUrl();
  if (!azure) return "";
  return getHireApiBaseUrl();
}

/** Resolves when the Azure backend is configured; returns the browser-facing admin base URL. */
export async function resolveAdminApiBaseUrl(): Promise<string> {
  const azure = await resolveApiBaseUrl();
  if (!azure) return "";
  return getAdminApiBaseUrl();
}

declare global {
  interface Window {
    adminAuthCheck?: Promise<unknown>;
  }
}

export function initAdminSessionGuard(loginPath: string): void {
  window.adminAuthCheck = resolveAdminApiBaseUrl().then((api) => {
    if (!api) {
      document.documentElement.dataset.adminAuth = "config-error";
      showAdminConfigError();
      throw new Error("api-not-configured");
    }
    return fetch(`${api}/session`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated) {
          location.replace(loginPath);
          throw new Error("unauthenticated");
        }
        document.documentElement.dataset.adminAuth = "ok";
        hideAdminConfigError();
        return d;
      })
      .catch((err) => {
        if (err?.message !== "unauthenticated") location.replace(loginPath);
        throw err;
      });
  });
}

export function initAdminLoginRedirect(adminHome: string): void {
  resolveAdminApiBaseUrl().then((api) => {
    if (!api) {
      showAdminConfigError();
      return;
    }
    fetch(`${api}/session`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) location.replace(adminHome);
      })
      .catch(() => {});
  });
}

export function showAdminConfigError(): void {
  const el = document.getElementById("admin-config-error");
  if (el) el.hidden = false;
}

export function hideAdminConfigError(): void {
  const el = document.getElementById("admin-config-error");
  if (el) el.hidden = true;
}

export async function enableLoginWhenApiReady(
  formId: string,
  submitSelector: string
): Promise<string> {
  const api = await resolveAdminApiBaseUrl();
  const form = document.getElementById(formId);
  const btn = form?.querySelector(submitSelector) as HTMLButtonElement | null;
  if (!api) {
    showAdminConfigError();
    if (btn) btn.disabled = true;
    return "";
  }
  hideAdminConfigError();
  if (btn) btn.disabled = false;
  return api;
}
