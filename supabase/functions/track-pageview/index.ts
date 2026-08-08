// Records an anonymous marketing-site pageview.
//
// Privacy: the raw IP is never stored. It is combined with the user-agent
// and a server-side salt that rotates daily, then SHA-256 hashed. The
// result identifies a visitor within a single day and cannot be reversed
// to an IP or used to follow someone across days.
//
// This runs with the service role so website_pageviews needs no public
// INSERT policy — a client-writable table could be scripted to inflate
// the numbers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { buildCors } from "../_shared/cors.ts";

// Paths we are willing to record. Anything else is ignored so the table
// cannot be filled with arbitrary strings.
const TRACKED_PREFIXES = ["/", "/ng", "/global", "/about", "/welcome", "/access-hub", "/contact", "/careers"];

function classifyReferrer(host: string | null): string {
  if (!host) return "direct";
  const h = host.toLowerCase();
  if (/(google|bing|duckduckgo|yahoo|baidu|yandex)\./.test(h)) return "search";
  if (/(facebook|instagram|linkedin|twitter|x\.com|t\.co|whatsapp|tiktok|youtube)\./.test(h)) return "social";
  return "referral";
}

function classifyDevice(ua: string): string {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
  if (/mobi|android|iphone|ipod|windows phone/.test(s)) return "mobile";
  return "desktop";
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  // Always answer 200. Analytics must never surface an error to a
  // marketing-site visitor or block page rendering.
  const ok = (body: Record<string, unknown> = { ok: true }) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let path = "/";
    let referrer = "";
    try {
      const body = await req.json();
      path     = typeof body?.path === "string" ? body.path : "/";
      referrer = typeof body?.referrer === "string" ? body.referrer : "";
    } catch {
      return ok({ ok: false, reason: "invalid_body" });
    }

    // Normalise: strip query/hash, drop trailing slash, cap length.
    path = path.split("?")[0].split("#")[0].slice(0, 200);
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

    const isTracked = TRACKED_PREFIXES.some(
      (p) => path === p || (p !== "/" && path.startsWith(p + "/")),
    );
    if (!isTracked) return ok({ ok: false, reason: "untracked_path" });

    // Client IP as seen by the edge. Falls back through the usual proxy headers.
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-real-ip") ??
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ??
      "unknown";

    const ua = req.headers.get("user-agent") ?? "";

    // Ignore obvious crawlers so they do not distort visitor counts.
    if (/bot|crawl|spider|slurp|bingpreview|headless|lighthouse|pingdom|uptime/i.test(ua)) {
      return ok({ ok: false, reason: "bot" });
    }

    // Country is provided by the CDN edge; we never geolocate the IP ourselves.
    const country =
      req.headers.get("cf-ipcountry") ??
      req.headers.get("x-vercel-ip-country") ??
      null;

    let referrerHost: string | null = null;
    if (referrer) {
      try {
        const h = new URL(referrer).hostname;
        // A referral from our own site is really internal navigation.
        referrerHost = /(^|\.)routeace\.app$/i.test(h) ? null : h;
      } catch { /* malformed referrer — treat as direct */ }
    }

    const svc = createClient(supabaseUrl, serviceKey);

    const { data: salt, error: saltErr } = await svc.rpc("get_daily_analytics_salt");
    if (saltErr || !salt) {
      console.error("salt fetch failed", saltErr);
      return ok({ ok: false, reason: "salt_unavailable" });
    }

    const visitorHash = await sha256Hex(`${ip}|${ua}|${salt}`);

    const { error: insErr } = await svc.from("website_pageviews").insert({
      visitor_hash:  visitorHash,
      path,
      referrer_host: referrerHost,
      referrer_type: classifyReferrer(referrerHost),
      country_code:  country,
      device_type:   classifyDevice(ua),
    });

    if (insErr) {
      console.error("pageview insert failed", insErr);
      return ok({ ok: false, reason: "insert_failed" });
    }

    return ok();
  } catch (e) {
    console.error("track-pageview error", e);
    return ok({ ok: false });
  }
});
