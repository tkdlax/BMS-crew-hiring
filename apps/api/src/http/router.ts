import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { handleOptions, corsHeaders } from "./cors.js";
import { error } from "./response.js";
import { handlePublic } from "../handlers/public.js";
import { handleApplications } from "../handlers/applications.js";
import { handleSchedule } from "../handlers/schedule.js";
import { handleAdmin } from "../handlers/admin.js";

type RouteHandler = (
  req: HttpRequest,
  ctx: InvocationContext,
  segments: string[]
) => Promise<HttpResponseInit>;

const routes: Array<{ prefix: string; handler: RouteHandler }> = [
  { prefix: "public", handler: handlePublic },
  { prefix: "applications", handler: handleApplications },
  { prefix: "schedule", handler: handleSchedule },
  { prefix: "admin", handler: handleAdmin },
];

export async function routeRequest(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  const opt = handleOptions(req);
  if (opt) return opt;

  const url = new URL(req.url);
  const routeParam =
    (req.params as Record<string, string | undefined>)?.route ??
    (req.params as Record<string, string | undefined>)?.["*route"];
  const path = routeParam
    ? routeParam.replace(/\/$/, "")
    : url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) {
    return withCors(req, { status: 200, body: "BMS Crew Hiring API" });
  }

  const [prefix, ...rest] = segments;
  const match = routes.find((r) => r.prefix === prefix);
  if (!match) {
    return withCors(req, error("Not found", 404));
  }

  try {
    const res = await match.handler(req, ctx, rest);
    return withCors(req, res);
  } catch (e) {
    ctx.error(e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return withCors(req, error(msg, 500));
  }
}

function withCors(req: HttpRequest, res: HttpResponseInit): HttpResponseInit {
  const cors = corsHeaders(req.headers.get("origin"));
  return {
    ...res,
    headers: {
      ...(res.headers ?? {}),
      ...cors,
    },
  };
}
