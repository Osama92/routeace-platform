/**
 * cors.ts - shared CORS + schema validation utilities for edge functions.
 * Never use wildcard (*) in production. Set ALLOWED_ORIGIN secret.
 */

export function buildCors(req?: Request): Record<string, string> {
  const requestOrigin = req?.headers.get("Origin") ?? "";
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGIN") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isRouteAceDomain = /^https:\/\/(www\.)?routeaceglyde\.app$/i.test(requestOrigin);
  const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(requestOrigin);
  const origin = allowedOrigins.includes(requestOrigin) || isRouteAceDomain || isLocalhost
    ? requestOrigin
    : allowedOrigins[0] ?? "https://routeace.app";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

export function preflight(cors: Record<string, string> = buildCors()): Response {
  return new Response(null, { status: 204, headers: cors });
}

export function json(
  payload: unknown,
  status = 200,
  cors: Record<string, string> = buildCors(),
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export function validateBody(
  body: Record<string, unknown>,
  required: string[],
  cors: Record<string, string> = buildCors(),
): Response | null {
  const missing = required.filter(
    (k) => body[k] === undefined || body[k] === null || body[k] === "",
  );
  if (missing.length === 0) return null;
  return json(
    {
      error: "Missing required fields",
      missing_fields: missing,
      hint: `Supply all of: ${required.join(", ")}`,
    },
    400,
    cors,
  );
}
