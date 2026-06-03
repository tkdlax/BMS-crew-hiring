import type { InvocationContext } from "@azure/functions";
import type { CaptchaProvider } from "@bms/shared";
import { resolveCaptchaProvider } from "@bms/shared";
import { config } from "../config.js";

export async function verifyCaptcha(
  token: string,
  remoteIp?: string,
  ctx?: InvocationContext,
  providerOverride?: CaptchaProvider
): Promise<boolean> {
  if (!config.captchaSecret) {
    ctx?.warn("CAPTCHA_SECRET is not configured");
    return process.env.NODE_ENV !== "production" && process.env.AZURE_FUNCTIONS_ENVIRONMENT !== "Production";
  }

  if (!token || token === "dev-bypass") {
    return false;
  }

  const provider = providerOverride ?? config.captchaProvider;

  if (provider === "turnstile") {
    const body = new URLSearchParams({
      secret: config.captchaSecret,
      response: token,
    });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body }
    );
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      ctx?.warn("Turnstile verification failed", { codes: data["error-codes"] ?? [], provider });
    }
    return !!data.success;
  }

  const body = new URLSearchParams({
    secret: config.captchaSecret,
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);
  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    body,
  });
  const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
  if (!data.success) {
    ctx?.warn("reCAPTCHA verification failed", { codes: data["error-codes"] ?? [], provider });
  }
  return !!data.success;
}

export { resolveCaptchaProvider };
