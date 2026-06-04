import type { APIRoute } from "astro";
import {
  buildOfficeProxyResponseHeaders,
  forwardOfficeRequestHeaders,
  upstreamOfficeUrl,
} from "../../../lib/officeProxy.server";

export const prerender = false;

async function proxyOffice({ params, request, locals }: Parameters<APIRoute>[0]) {
  const segments = params.path;
  const subpath = Array.isArray(segments) ? segments.join("/") : segments ?? "";
  const search = new URL(request.url).search;
  const target = upstreamOfficeUrl(locals, subpath, search);

  if (!target) {
    return new Response(JSON.stringify({ error: "API not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  const upstream = await fetch(target, {
    method,
    headers: forwardOfficeRequestHeaders(request),
    body,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: buildOfficeProxyResponseHeaders(upstream),
  });
}

export const GET = proxyOffice;
export const POST = proxyOffice;
export const PUT = proxyOffice;
export const DELETE = proxyOffice;
export const OPTIONS = proxyOffice;
