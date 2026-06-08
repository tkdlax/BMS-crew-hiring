import type { InvocationContext } from "@azure/functions";
import type { CaptchaProvider } from "@bms/shared";
import { resolveCaptchaProvider } from "@bms/shared";
import { config } from "../config.js";

export type CaptchaVerifyResult = {
  ok: boolean;
  codes: string[];
  provider: CaptchaProvider;
};

export function captchaFailureMessage(codes: string[]): string {
  if (codes.includes("timeout-or-duplicate")) {
    return "Security check expired. Please complete CAPTCHA again and resubmit.";
  }
  if (codes.includes("browser-error")) {
    return "Security check could not be verified. Please refresh the page and try again.";
  }
  return "CAPTCHA verification failed";
}

export async function verifyCaptcha(
  token: string,
  remoteIp?: string,
  ctx?: InvocationContext,
  providerOverride?: CaptchaProvider
): Promise<CaptchaVerifyResult> {
  const provider = providerOverride ?? config.captchaProvider;

  if (!config.captchaSecret) {
    ctx?.warn("CAPTCHA_SECRET is not configured", { provider });
    const devBypass =
      process.env.CAPTCHA_DISABLED === "true" &&
      process.env.NODE_ENV !== "production" &&
      process.env.AZURE_FUNCTIONS_ENVIRONMENT !== "Production";
    return { ok: devBypass, codes: devBypass ? [] : ["missing-input-secret"], provider };
  }

  if (!token || token === "dev-bypass") {
    return { ok: false, codes: ["missing-input-response"], provider };
  }

  if (provider === "turnstile") {
    const body = new URLSearchParams({
      secret: config.captchaSecret,
      response: token,
    });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body }
    );
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    const codes = data["error-codes"] ?? [];
    if (!data.success) {
      ctx?.warn("Turnstile verification failed", { codes, provider });
    }
    return { ok: !!data.success, codes, provider };
  }

  // Omit remoteip for reCAPTCHA — proxied requests often carry the worker IP, not the applicant's.
  const body = new URLSearchParams({
    secret: config.captchaSecret,
    response: token,
  });
  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    body,
  });
  const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
  const codes = data["error-codes"] ?? [];
  if (!data.success) {
    ctx?.warn("reCAPTCHA verification failed", { codes, provider });
  }
  return { ok: !!data.success, codes, provider };
}

export { resolveCaptchaProvider };
