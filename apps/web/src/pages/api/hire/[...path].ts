import type { APIRoute } from "astro";
import {
  buildHireProxyResponseHeaders,
  forwardHireRequestHeaders,
  upstreamHireUrl,
} from "../../../lib/hireProxy.server";

export const prerender = false;

async function proxyHire({ params, request, locals }: Parameters<APIRoute>[0]) {
  const segments = params.path;
  const subpath = Array.isArray(segments) ? segments.join("/") : segments ?? "";
  const search = new URL(request.url).search;
  const target = upstreamHireUrl(locals, subpath, search);

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
    headers: forwardHireRequestHeaders(request),
    body,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: buildHireProxyResponseHeaders(upstream),
  });
}

export const GET = proxyHire;
export const POST = proxyHire;
export const PUT = proxyHire;
export const DELETE = proxyHire;
export const OPTIONS = proxyHire;
