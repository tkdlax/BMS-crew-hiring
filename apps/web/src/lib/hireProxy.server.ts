import { getRuntimeApiBaseUrl } from "./api";

/** Same-origin base for applicant API calls, e.g. /hiring/api/hire */
export function hireProxyBasePath(): string {
  const base = import.meta.env.BASE_URL || "/";
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return `${withSlash}api/hire`;
}

export function upstreamHireUrl(locals: App.Locals, subpath: string, search: string): string | null {
  const api = getRuntimeApiBaseUrl(locals);
  if (!api) return null;
  const path = subpath.replace(/^\//, "");
  return `${api}/${path}${search}`;
}

export function forwardHireRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (clientIp) headers.set("X-Forwarded-For", clientIp);

  return headers;
}

export function buildHireProxyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  return headers;
}
