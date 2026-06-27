import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { buildCors } from "../_shared/cors.ts";
import { requireAuth, makeAdminClient } from "../_shared/require-auth.ts";

const CORE_ROLES = new Set([
  "core_founder", "core_cofounder", "core_builder", "core_product",
  "core_engineer", "core_analyst", "internal_team",
]);

serve(async (req) => {
  const corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;

  // Only core team roles can access cross-org data
  if (!auth.userRoles.some((r) => CORE_ROLES.has(r))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── DELETE org ──────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    try {
      const { org_id } = await req.json();
      if (!org_id) {
        return new Response(JSON.stringify({ error: "org_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const admin = makeAdminClient();
      const { error } = await admin.rpc("delete_organization_cascade", { p_org_id: org_id });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      console.error("delete_organization error:", e);
      return new Response(JSON.stringify({ error: e.message || "Delete failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ── GET metrics ─────────────────────────────────────────────────────
  try {
    // Service-role client bypasses RLS — required for cross-org aggregation
    const admin = makeAdminClient();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();

    const [orgsRes, profilesRes, dispatchesRes, invoicesRes, commissionRes, apiRes] =
      await Promise.all([
        admin.from("organizations").select("id, name, subscription_tier, plan_tier, is_active, created_at"),
        admin.from("profiles").select("id, organization_id"),
        admin.from("dispatches").select("id, organization_id"),
        admin.from("invoices").select("id, organization_id, total_amount, status, created_at"),
        admin.from("commission_ledger").select("source_org_id, gross_amount, routeace_amount"),
        admin.from("api_request_logs").select("id", { count: "exact", head: true }),
      ]);

    const orgs = orgsRes.data || [];
    const profiles = profilesRes.data || [];
    const dispatches = dispatchesRes.data || [];
    const invoices = invoicesRes.data || [];
    const commissions = commissionRes.data || [];

    // Build per-org maps
    const orgUserMap = new Map<string, number>();
    profiles.forEach((p: any) => {
      if (p.organization_id) orgUserMap.set(p.organization_id, (orgUserMap.get(p.organization_id) || 0) + 1);
    });

    const orgDispatchMap = new Map<string, number>();
    dispatches.forEach((d: any) => {
      if (d.organization_id) orgDispatchMap.set(d.organization_id, (orgDispatchMap.get(d.organization_id) || 0) + 1);
    });

    const orgRevenueMap = new Map<string, number>();
    invoices.filter((i: any) => i.status === "paid").forEach((i: any) => {
      if (i.organization_id) orgRevenueMap.set(i.organization_id, (orgRevenueMap.get(i.organization_id) || 0) + Number(i.total_amount || 0));
    });
    // Commission fallback for orgs with no direct invoices
    commissions.forEach((c: any) => {
      if (c.source_org_id && !orgRevenueMap.has(c.source_org_id)) {
        orgRevenueMap.set(c.source_org_id, (orgRevenueMap.get(c.source_org_id) || 0) + Number(c.gross_amount || 0));
      }
    });

    // Platform-level aggregates
    const totalRevenue = invoices.filter((i: any) => i.status === "paid")
      .reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
    const monthlyRevenue = invoices
      .filter((i: any) => i.status === "paid" && i.created_at >= thirtyDaysAgo)
      .reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
    const routeaceCommission = commissions.reduce((s: number, c: any) => s + Number(c.routeace_amount || 0), 0);
    const resellerVolume = commissions.reduce((s: number, c: any) => s + Number(c.gross_amount || 0), 0);
    const activeOrgs = orgs.filter((o: any) => o.is_active).length;
    const recentOrgs = orgs.filter((o: any) => o.created_at >= thirtyDaysAgo).length;
    const priorOrgs = orgs.filter((o: any) => o.created_at >= sixtyDaysAgo && o.created_at < thirtyDaysAgo).length;
    const growthRate = priorOrgs > 0 ? ((recentOrgs - priorOrgs) / priorOrgs) * 100 : (recentOrgs > 0 ? 100 : 0);
    const churnRate = orgs.length > 0 ? ((orgs.length - activeOrgs) / orgs.length) * 100 : 0;

    // Per-org summaries
    const orgSummaries = [...orgs]
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map((org: any) => {
        const users = orgUserMap.get(org.id) || 0;
        const dispatches = orgDispatchMap.get(org.id) || 0;
        const revenue = orgRevenueMap.get(org.id) || 0;
        return {
          id: org.id,
          name: org.name,
          tier: org.subscription_tier || org.plan_tier || "starter",
          is_active: org.is_active,
          revenue,
          users,
          dispatches,
          churnRisk: dispatches > 5 ? "low" : dispatches > 0 ? "medium" : "high",
        };
      });

    return new Response(JSON.stringify({
      metrics: {
        totalOrganizations: orgs.length,
        activeOrganizations: activeOrgs,
        totalRevenue,
        monthlyRecurring: monthlyRevenue,
        churnRate: Math.round(churnRate * 10) / 10,
        avgRevenuePerTenant: activeOrgs > 0 ? totalRevenue / activeOrgs : 0,
        totalResellerVolume: resellerVolume,
        routeaceCommission,
        apiUsage: apiRes.count || 0,
        growthRate: Math.round(growthRate * 10) / 10,
        totalUsers: profiles.length,
        totalDispatches: dispatches.length,
      },
      organizations: orgSummaries,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("core-platform-metrics error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
