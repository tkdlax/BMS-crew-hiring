import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import { config } from "../config.js";

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, "");
}

/** Add www / non-www variants so both baileysallied.com and www.baileysallied.com work. */
function expandOriginVariants(origin: string): string[] {
  try {
    const u = new URL(origin);
    const variants = new Set<string>([normalizeOrigin(u.origin)]);
    if (u.hostname.startsWith("www.")) {
      variants.add(normalizeOrigin(`${u.protocol}//${u.hostname.slice(4)}`));
    } else if (!u.hostname.includes("localhost") && !u.hostname.includes("127.0.0.1")) {
      variants.add(normalizeOrigin(`${u.protocol}//www.${u.hostname}`));
    }
    return [...variants];
  } catch {
    return [normalizeOrigin(origin)];
  }
}

function siteBaseToOrigin(siteBaseUrl: string): string | null {
  try {
    return normalizeOrigin(new URL(siteBaseUrl).origin);
  } catch {
    return null;
  }
}

export function getAllowedOrigins(): string[] {
  const set = new Set<string>();
  for (const entry of config.allowedOrigins) {
    for (const variant of expandOriginVariants(entry)) {
      set.add(variant);
    }
  }
  const fromSite = siteBaseToOrigin(config.publicSiteBaseUrl);
  if (fromSite) {
    for (const variant of expandOriginVariants(fromSite)) {
      set.add(variant);
    }
  }
  return [...set];
}

/** Origin to echo on Access-Control-Allow-Origin, or null if not allowed. */
export function resolveCorsOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;
  const origin = normalizeOrigin(requestOrigin);
  const allowed = getAllowedOrigins();
  if (allowed.includes("*")) return "*";
  return allowed.includes(origin) ? origin : null;
}

export function corsHeaders(
  origin: string | null,
  requestHeaders?: string | null
): Record<string, string> {
  const match = resolveCorsOrigin(origin);
  const base: Record<string, string> = { Vary: "Origin" };
  if (!match) return base;

  const allowHeaders =
    requestHeaders?.trim() || "Content-Type, Authorization, Accept";

  return {
    ...base,
    "Access-Control-Allow-Origin": match,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Max-Age": "86400",
  };
}

export function handleOptions(req: HttpRequest): HttpResponseInit | null {
  if (req.method !== "OPTIONS") return null;
  const origin = req.headers.get("origin");
  const requestHeaders = req.headers.get("Access-Control-Request-Headers");
  const headers = corsHeaders(origin, requestHeaders);
  if (!headers["Access-Control-Allow-Origin"]) {
    return { status: 403, headers };
  }
  return { status: 204, headers };
}
