import type { HttpResponseInit } from "@azure/functions";

export function json(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): HttpResponseInit {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  };
}

export function error(message: string, status = 400): HttpResponseInit {
  return json({ error: message }, status);
}

export function noContent(): HttpResponseInit {
  return { status: 204 };
}
