import { getRuntimeApiBaseUrl } from "./api";

const SESSION_COOKIE = "bms_admin_session";

export function officeProxyBasePath(): string {
  const base = import.meta.env.BASE_URL || "/";
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return `${withSlash}api/office`;
}

export function upstreamOfficeUrl(locals: App.Locals, subpath: string, search: string): string | null {
  const api = getRuntimeApiBaseUrl(locals);
  if (!api) return null;
  const path = subpath.replace(/^\//, "");
  return `${api}/office/${path}${search}`;
}

function cookiePath(): string {
  const base = import.meta.env.BASE_URL || "/hiring/";
  const trimmed = base.replace(/\/$/, "") || "/";
  return trimmed;
}

export function rewriteOfficeSetCookie(setCookie: string): string {
  const path = cookiePath();
  const nameValue = setCookie.split(";")[0]?.trim();
  if (!nameValue) return setCookie;
  return `${nameValue}; Path=${path}; SameSite=Lax; Secure; HttpOnly`;
}

export function forwardOfficeRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const cookie = request.headers.get("cookie");
  if (cookie) {
    const session = cookie
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith(`${SESSION_COOKIE}=`));
    if (session) headers.set("Cookie", session);
  }
  return headers;
}

export function buildOfficeProxyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const cookies = upstream.headers.getSetCookie?.() ?? [];
  if (cookies.length) {
    for (const raw of cookies) {
      headers.append("Set-Cookie", rewriteOfficeSetCookie(raw));
    }
  } else {
    const single = upstream.headers.get("set-cookie");
    if (single) headers.append("Set-Cookie", rewriteOfficeSetCookie(single));
  }

  return headers;
}
