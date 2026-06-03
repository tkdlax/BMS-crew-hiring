import type { InvocationContext } from "@azure/functions";
import { resolveCaptchaProvider } from "@bms/shared";
import { config } from "../config.js";

export async function verifyCaptcha(
  token: string,
  remoteIp?: string,
  ctx?: InvocationContext
): Promise<boolean> {
  if (!config.captchaSecret) {
    return process.env.NODE_ENV !== "production" && process.env.AZURE_FUNCTIONS_ENVIRONMENT !== "Production";
  }

  if (!token || token === "dev-bypass") {
    return false;
  }

  const provider = config.captchaProvider;

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
      ctx?.warn("Turnstile verification failed", data["error-codes"] ?? []);
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
    ctx?.warn("reCAPTCHA verification failed", data["error-codes"] ?? []);
  }
  return !!data.success;
}

export { resolveCaptchaProvider };
