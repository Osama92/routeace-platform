import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAnthropic, mapModel } from "../_shared/anthropic.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
const json = (d: any, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const route = url.searchParams.get("route") || "/list";
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    if (route === "/list") {
      const { data } = await supabase.from("tenant_websites").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return json({ data: data || [] });
    }

    if (route === "/generate" && req.method === "POST") {
      const { company_name, services = [], cities_served = [], fleet_size, target_clients = [], brand_style = "professional", primary_color = "#0EA5E9", contact_email, contact_phone, contact_whatsapp, tagline } = body;
      if (!company_name) return json({ error: "company_name required" }, 400);

      const subdomain = `${slugify(company_name)}-${user.id.slice(0, 6)}`;
      const seoKeywords = [
        `${services[0] || "logistics"} in ${cities_served[0] || "Nigeria"}`,
        `${company_name} logistics`,
        `reliable ${services[0] || "haulage"} ${cities_served[0] || ""}`.trim(),
        "fleet tracking",
        "delivery services",
      ];

      // Use Lovable AI to draft hero + services copy
      let aiCopy: any = {};
      if (ANTHROPIC_API_KEY) {
        const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: mapModel("google/gemini-3-flash-preview"),
            messages: [
              { role: "system", content: "You are a logistics marketing copywriter. Return ONLY JSON." },
              { role: "user", content: `Write website copy for "${company_name}" - a ${brand_style} ${services.join(", ") || "logistics"} company serving ${cities_served.join(", ") || "Nigeria"}, fleet of ${fleet_size || "growing"} vehicles, targeting ${target_clients.join(", ") || "businesses"}. Return JSON: { "hero_headline": "", "hero_sub": "", "value_props": ["","",""], "services_intro": "", "about_us": "", "cta": "" }` },
            ],
          }),
        });
        try {
          const aiJ = await aiResp.json();
          const txt = aiJ?.choices?.[0]?.message?.content || "{}";
          aiCopy = JSON.parse(txt.replace(/```json|```/g, "").trim());
        } catch (_e) { aiCopy = {}; }
      }

      const fallbackHero = `Reliable ${services[0] || "Logistics"} & Delivery Solutions Across ${cities_served[0] || "Nigeria"}`;

      const { data: site, error } = await supabase.from("tenant_websites").insert({
        user_id: user.id,
        company_name,
        subdomain,
        brand_style,
        primary_color,
        tagline: tagline || aiCopy.hero_sub || "Powered by Routeace",
        services,
        cities_served,
        fleet_size,
        target_clients,
        contact_email,
        contact_phone,
        contact_whatsapp,
        status: "draft",
        seo_keywords: seoKeywords,
        meta_title: `${company_name} - ${services[0] || "Logistics"} in ${cities_served[0] || "Nigeria"}`,
        meta_description: (aiCopy.hero_sub || `${company_name} provides reliable ${services.join(", ") || "logistics"} services across ${cities_served.join(", ") || "Nigeria"}.`).slice(0, 160),
        ai_generated_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;

      const pages = [
        { slug: "home", page_type: "home", title: aiCopy.hero_headline || fallbackHero, content: { hero_headline: aiCopy.hero_headline || fallbackHero, hero_sub: aiCopy.hero_sub || `Trusted by ${target_clients[0] || "businesses"} across ${cities_served.join(", ") || "Nigeria"}.`, value_props: aiCopy.value_props || ["On-time delivery", "Real-time tracking", "Verified drivers"], cta: aiCopy.cta || "Request a Quote" } },
        { slug: "services", page_type: "services", title: "Our Services", content: { intro: aiCopy.services_intro || `We offer ${services.join(", ") || "haulage and last-mile delivery"} backed by AI-powered routing.`, services } },
        { slug: "coverage", page_type: "coverage", title: "Coverage", content: { cities: cities_served, fleet_size } },
        { slug: "about", page_type: "about", title: "About Us", content: { body: aiCopy.about_us || `${company_name} is a logistics partner committed to reliability and efficiency.` } },
        { slug: "contact", page_type: "contact", title: "Contact", content: { email: contact_email, phone: contact_phone, whatsapp: contact_whatsapp } },
      ];
      for (const p of pages) {
        await supabase.from("tenant_website_pages").insert({ ...p, website_id: site.id, user_id: user.id, is_published: false, seo_meta: { keywords: seoKeywords } });
      }

      return json({ success: true, website: site, pages_created: pages.length });
    }

    if (route === "/publish" && req.method === "POST") {
      const { website_id } = body;
      await supabase.from("tenant_websites").update({ status: "published", published_at: new Date().toISOString() }).eq("id", website_id).eq("user_id", user.id);
      await supabase.from("tenant_website_pages").update({ is_published: true }).eq("website_id", website_id).eq("user_id", user.id);
      return json({ success: true });
    }

    if (route === "/leads") {
      const { data } = await supabase.from("tenant_website_leads").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      return json({ data: data || [] });
    }

    if (route === "/pages") {
      const website_id = url.searchParams.get("website_id");
      const { data } = await supabase.from("tenant_website_pages").select("*").eq("website_id", website_id!).eq("user_id", user.id);
      return json({ data: data || [] });
    }

    return json({ error: "Unknown route" }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
