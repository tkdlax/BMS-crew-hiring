import type { APIRoute } from "astro";
import {
  buildProxyResponseHeaders,
  forwardRequestHeaders,
  upstreamAdminUrl,
} from "../../../lib/adminProxy.server";

export const prerender = false;

async function proxyAdmin({ params, request, locals }: Parameters<APIRoute>[0]) {
  const segments = params.path;
  const subpath = Array.isArray(segments) ? segments.join("/") : segments ?? "";
  const search = new URL(request.url).search;
  const target = upstreamAdminUrl(locals, subpath, search);

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
    headers: forwardRequestHeaders(request),
    body,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: buildProxyResponseHeaders(upstream),
  });
}

export const GET = proxyAdmin;
export const POST = proxyAdmin;
export const PUT = proxyAdmin;
export const DELETE = proxyAdmin;
export const OPTIONS = proxyAdmin;
