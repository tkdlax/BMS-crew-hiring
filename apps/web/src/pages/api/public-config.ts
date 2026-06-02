import type { APIRoute } from "astro";
import { getRuntimeApiBaseUrl } from "../../lib/api";

export const prerender = false;

function runtimeEnv(locals: App.Locals): Record<string, string | undefined> {
  return (locals.runtime?.env ?? {}) as Record<string, string | undefined>;
}

export const GET: APIRoute = async ({ locals }) => {
  const env = runtimeEnv(locals);
  const apiBaseUrl = getRuntimeApiBaseUrl(locals);
  const captchaSiteKey =
    env.PUBLIC_CAPTCHA_SITE_KEY?.trim() || import.meta.env.PUBLIC_CAPTCHA_SITE_KEY?.trim() || "";
  return new Response(JSON.stringify({ apiBaseUrl, captchaSiteKey }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
