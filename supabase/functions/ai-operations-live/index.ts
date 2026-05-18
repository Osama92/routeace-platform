/**
 * ai-operations-live
 * Returns LIVE, tenant-scoped operational intelligence for the AI Operations Controller.
 * Scoped to the caller's organization_id (LD multi-tenant safe).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { rateLimit } from "../_shared/rate-limit.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Phase 9: per-user rate limit (60 req/min).
    const rl = rateLimit({ bucket: "ai-ops-live", identifier: userData.user.id, limit: 60, windowMs: 60_000 });
    if (!rl.allowed) return rl.response!;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: membership, error: memErr } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (memErr) console.error("membership lookup error", memErr);

    const orgId = membership?.organization_id;
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "No organization for user" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Resolve tenant mode - Logistics Department tenants must NEVER receive
    // financial KPIs (revenue / AR / overdue) from this endpoint.
    const { data: org } = await admin
      .from("organizations")
      .select("tenant_mode")
      .eq("id", orgId)
      .maybeSingle();
    const tenantMode = (org?.tenant_mode ?? "").toUpperCase();
    const isLD = tenantMode === "LOGISTICS_DEPARTMENT";

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString();

    const dispatchPromise = admin
      .from("dispatches")
      .select(
        "id, status, scheduled_delivery, actual_delivery, cost, created_at, vehicle_id, driver_id",
      )
      .eq("organization_id", orgId)
      .gte("created_at", last7d);

    const vehiclesPromise = admin.from("vehicles").select(
      "id, status, organization_id",
    ).eq("organization_id", orgId);

    const driversPromise = admin.from("drivers").select(
      "id, organization_id",
    ).eq("organization_id", orgId);

    const slaPromise = admin
      .from("sla_breach_alerts")
      .select("id, dispatch_id, severity, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", last7d);

    const breakdownsPromise = admin
      .from("breakdown_alerts")
      .select("id, vehicle_id, severity, alert_type, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", last7d)
      .order("created_at", { ascending: false });

    // CRITICAL: invoices are a financial source. We must not query them at all
    // for Logistics Department tenants - LD never sees revenue/AR.
    const invoicesPromise = isLD
      ? Promise.resolve({ data: [] as any[] })
      : admin
        .from("invoices")
        .select("id, total_amount, status, dispatch_id, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", last7d);

    const [
      dispatchesRes,
      vehiclesRes,
      driversRes,
      slaRes,
      invoicesRes,
      breakdownsRes,
    ] = await Promise.all([
      dispatchPromise,
      vehiclesPromise,
      driversPromise,
      slaPromise,
      invoicesPromise,
      breakdownsPromise,
    ]);

    const dispatches = dispatchesRes.data ?? [];
    const vehicles = vehiclesRes.data ?? [];
    const drivers = driversRes.data ?? [];
    const slaBreaches = slaRes.data ?? [];
    const invoices = invoicesRes.data ?? [];
    const breakdowns = breakdownsRes.data ?? [];

    const today = dispatches.filter((d) => d.created_at >= last24h);
    const delivered = dispatches.filter((d) => d.status === "delivered");
    const onTime = delivered.filter(
      (d) =>
        d.scheduled_delivery && d.actual_delivery &&
        new Date(d.actual_delivery) <= new Date(d.scheduled_delivery),
    );
    const otdRate = delivered.length
      ? Math.round((onTime.length / delivered.length) * 100)
      : 0;

    const activeVehicles = vehicles.filter((v) =>
      ["active", "in_use", "in_transit", "available"].includes(
        (v.status ?? "").toLowerCase(),
      )
    ).length;
    const fleetUtil = vehicles.length
      ? Math.round((activeVehicles / vehicles.length) * 100)
      : 0;

    const totalRevenue = invoices.reduce(
      (s, i) => s + Number(i.total_amount ?? 0),
      0,
    );
    const overdue = invoices
      .filter((i) => (i.status ?? "").toLowerCase() === "overdue")
      .reduce((s, i) => s + Number(i.total_amount ?? 0), 0);

    const pending = dispatches.filter((d) =>
      ["pending", "scheduled", "draft"].includes((d.status ?? "").toLowerCase())
    ).length;
    const inTransit = dispatches.filter((d) =>
      ["in_transit", "in-transit", "out_for_delivery", "picked_up"].includes(
        (d.status ?? "").toLowerCase(),
      )
    ).length;

    // Predictions derived from real signals
    const slaRisk = delivered.length
      ? Math.min(100, Math.round((slaBreaches.length / delivered.length) * 100))
      : 0;

    const demandSpike = Math.min(
      100,
      Math.round((today.length / Math.max(1, dispatches.length / 7)) * 30),
    );

    const breakdownCount = breakdowns.filter((b) =>
      (b.severity ?? "").toLowerCase() === "critical"
    ).length;
    const maintenanceRisk = vehicles.length
      ? Math.min(100, Math.round((breakdownCount / vehicles.length) * 100))
      : 0;

    const predictions = [
      {
        metric: "Demand Spike Risk",
        value: demandSpike,
        trend: demandSpike > 50 ? "up" : "down",
        recommendation: demandSpike > 60
          ? `Pre-position vehicles - ${today.length} new dispatches in last 24h vs avg ${
            Math.round(dispatches.length / 7)
          }/day`
          : `Demand stable at ${today.length} dispatches today`,
        priority: demandSpike > 70 ? "high" : "medium",
      },
      {
        metric: "SLA Breach Probability",
        value: slaRisk,
        trend: slaRisk > 30 ? "up" : "down",
        recommendation: slaRisk > 30
          ? `${slaBreaches.length} SLA breach${
            slaBreaches.length === 1 ? "" : "es"
          } in last 7 days - review dispatcher routing rules`
          : "SLA performance is healthy",
        priority: slaRisk > 50 ? "high" : slaRisk > 25 ? "medium" : "low",
      },
      {
        metric: "Fleet Utilisation",
        value: fleetUtil,
        trend: fleetUtil < 50 ? "down" : "up",
        recommendation: fleetUtil < 50
          ? `${
            vehicles.length - activeVehicles
          } idle vehicles - assign or reduce fleet`
          : `Fleet running at ${fleetUtil}% - healthy`,
        priority: fleetUtil < 30 ? "high" : "medium",
      },
      {
        metric: "Maintenance Alert",
        value: maintenanceRisk,
        trend: maintenanceRisk > 0 ? "up" : "down",
        recommendation: breakdowns.length > 0
          ? `${breakdowns.length} breakdown event${
            breakdowns.length === 1 ? "" : "s"
          } in last 7 days - schedule inspections`
          : "No recent breakdowns flagged",
        priority: breakdownCount > 0 ? "critical" : "low",
      },
      // Revenue at Risk - financial KPI, omitted entirely for LD tenants.
      ...(isLD ? [] : [{
        metric: "Revenue at Risk",
        value: totalRevenue
          ? Math.min(100, Math.round((overdue / totalRevenue) * 100))
          : 0,
        trend: overdue > 0 ? "up" : "down",
        recommendation: overdue > 0
          ? `₦${overdue.toLocaleString()} overdue across ${
            invoices.filter((i) => (i.status ?? "").toLowerCase() === "overdue")
              .length
          } invoices - escalate to collections`
          : "No overdue receivables",
        priority: overdue > totalRevenue * 0.2 ? "high" : "medium",
      }]),
      {
        metric: "Pending Dispatch Backlog",
        value: dispatches.length
          ? Math.min(100, Math.round((pending / dispatches.length) * 100))
          : 0,
        trend: pending > inTransit ? "up" : "down",
        recommendation: pending > 0
          ? `${pending} dispatch${
            pending === 1 ? "" : "es"
          } awaiting assignment`
          : "All dispatches assigned",
        priority: pending > 10 ? "high" : "medium",
      },
    ];

    const baseKpis: Record<string, number> = {
      interventions_today: slaBreaches.filter((s) => s.created_at >= last24h)
        .length + breakdowns.filter((b) => b.created_at >= last24h).length,
      pending_approvals: pending,
      otd_rate: otdRate,
      fleet_utilisation: fleetUtil,
      total_dispatches: dispatches.length,
      dispatches_7d: dispatches.length,
      sla_breaches_7d: slaBreaches.length,
      delivered: delivered.length,
      in_transit: inTransit,
      active_vehicles: activeVehicles,
      total_vehicles: vehicles.length,
      total_drivers: drivers.length,
    };

    // Financial KPIs are appended ONLY for non-LD tenants (LC, transporter).
    // LD payloads must never expose total_revenue / overdue_amount /
    // revenue_recovered / cost_savings.
    const kpis = isLD ? baseKpis : {
      ...baseKpis,
      revenue_recovered: 0,
      cost_savings: 0,
      total_revenue: totalRevenue,
      overdue_amount: overdue,
    };

    return new Response(
      JSON.stringify({
        organization_id: orgId,
        tenant_mode: tenantMode || null,
        is_logistics_department: isLD,
        generated_at: now.toISOString(),
        kpis,
        predictions,
        recent_breakdowns: breakdowns.slice(0, 5),
        recent_sla_breaches: slaBreaches.slice(0, 5),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
