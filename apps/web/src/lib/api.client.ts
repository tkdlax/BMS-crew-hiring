import { getApiBaseUrl, normalizeApiBaseUrl } from "./api";

/** Same-origin config endpoint (Webflow runtime env). */
export function getPublicConfigUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return `${withSlash}api/public-config`;
}

type PublicConfig = { apiBaseUrl?: string; captchaSiteKey?: string };

let cachedConfig: PublicConfig | undefined;

async function loadPublicConfig(): Promise<PublicConfig> {
  if (cachedConfig !== undefined) return cachedConfig;

  const buildApi = getApiBaseUrl();
  const buildCaptcha = import.meta.env.PUBLIC_CAPTCHA_SITE_KEY?.trim() ?? "";
  if (buildApi) {
    cachedConfig = { apiBaseUrl: buildApi, captchaSiteKey: buildCaptcha };
    return cachedConfig;
  }

  try {
    const res = await fetch(getPublicConfigUrl());
    if (!res.ok) throw new Error(`config ${res.status}`);
    const data = (await res.json()) as PublicConfig;
    cachedConfig = {
      apiBaseUrl: normalizeApiBaseUrl(data.apiBaseUrl),
      captchaSiteKey: data.captchaSiteKey?.trim() ?? "",
    };
  } catch {
    cachedConfig = { apiBaseUrl: "", captchaSiteKey: "" };
  }

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

declare global {
  interface Window {
    adminAuthCheck?: Promise<unknown>;
  }
}

export function initAdminSessionGuard(loginPath: string): void {
  window.adminAuthCheck = resolveApiBaseUrl().then((api) => {
    if (!api) {
      document.documentElement.dataset.adminAuth = "config-error";
      showAdminConfigError();
      throw new Error("api-not-configured");
    }
    return fetch(`${api}/admin/session`, { credentials: "include" })
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
  resolveApiBaseUrl().then((api) => {
    if (!api) {
      showAdminConfigError();
      return;
    }
    fetch(`${api}/admin/session`, { credentials: "include" })
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
  const api = await resolveApiBaseUrl();
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
