import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import { config } from "../config.js";

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = config.allowedOrigins;
  const match =
    origin && allowed.some((o) => o === origin || o === "*") ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": match ?? "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function handleOptions(req: HttpRequest): HttpResponseInit | null {
  if (req.method === "OPTIONS") {
    return {
      status: 204,
      headers: corsHeaders(req.headers.get("origin")),
    };
  }
  return null;
}
