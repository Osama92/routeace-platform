import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const url = new URL(req.url);
    const route = url.searchParams.get("route") || "/";
    let body: any = null;
    if (req.method === "POST") {
      try { body = await req.json(); } catch (_e) { body = {}; }
    }

    // ─── INITIALIZE AI EMPLOYEES ───
    if (route === "/initialize") {
      const employees = [
        { user_id: user.id, role_key: "ops_manager", display_name: "Operations Manager AI", status: "active", autonomy_mode: "suggest_only", current_task: "Monitoring fleet availability", confidence_score: 78, next_suggested_action: "Review 3 pending dispatch requests" },
        { user_id: user.id, role_key: "finance_manager", display_name: "Finance Manager AI", status: "active", autonomy_mode: "suggest_only", current_task: "Tracking receivables", confidence_score: 85, next_suggested_action: "Follow up on ₦4.2M overdue invoices" },
        { user_id: user.id, role_key: "support_agent", display_name: "Support Manager AI", status: "active", autonomy_mode: "suggest_only", current_task: "Monitoring delivery statuses", confidence_score: 92, next_suggested_action: "Send updates to 5 clients" },
        { user_id: user.id, role_key: "growth_agent", display_name: "Growth & Marketing AI", status: "active", autonomy_mode: "suggest_only", current_task: "Analyzing demand signals", confidence_score: 72, next_suggested_action: "Engage 3 new inbound leads" },
      ];

      for (const emp of employees) {
        await supabase.from("ai_employees").upsert(emp, { onConflict: "user_id,role_key" });
      }

      // Init config
      await supabase.from("ai_workforce_config").upsert({ user_id: user.id }, { onConflict: "user_id" });

      return json({ success: true, message: "AI Workforce initialized" });
    }

    // ─── GET EMPLOYEES ───
    if (route === "/employees") {
      const { data, error } = await supabase.from("ai_employees").select("*").eq("user_id", user.id).order("role_key");
      if (error) throw error;
      return json({ data });
    }

    // ─── UPDATE AUTONOMY MODE ───
    if (route === "/autonomy" && req.method === "POST") {
      const { employee_id, mode } = body;
      const { error } = await supabase.from("ai_employees").update({ autonomy_mode: mode, updated_at: new Date().toISOString() }).eq("id", employee_id).eq("user_id", user.id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── GET ACTIONS ───
    if (route === "/actions") {
      const status = url.searchParams.get("status");
      let q = supabase.from("ai_employee_actions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return json({ data });
    }

    // ─── APPROVE / REJECT ACTION ───
    if (route === "/actions/decide" && req.method === "POST") {
      const { action_id, decision, reason } = body;
      const update: any = { status: decision === "approve" ? "approved" : "rejected" };
      if (decision === "approve") { update.approved_by = user.id; update.approved_at = new Date().toISOString(); }
      if (reason) update.rejected_reason = reason;
      const { error } = await supabase.from("ai_employee_actions").update(update).eq("id", action_id).eq("user_id", user.id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── GENERATE AI ACTIONS FROM LIVE TENANT DATA ───
    if (route === "/simulate-ops" && req.method === "POST") {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: membership } = await admin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      const orgId = (membership as any)?.organization_id as string | undefined;
      if (!orgId) return json({ error: "No organisation scope found for user" }, 403);

      const isoNow = new Date().toISOString();
      const last30 = new Date(Date.now() - 30 * 86400000).toISOString();

      const [
        { data: idleVehicles },
        { data: pendingDispatches },
        { data: overdueInvoices },
        { data: inTransit },
        { data: recentCustomers },
      ] = await Promise.all([
        supabase.from("vehicles").select("id, status").eq("status", "available"),
        supabase.from("dispatches").select("id, status").eq("organization_id", orgId).in("status", ["pending", "scheduled", "draft"]).limit(50),
        supabase.from("invoices").select("id, total_amount, due_date, status").eq("organization_id", orgId).in("status", ["sent", "overdue", "partial"]).lt("due_date", isoNow).limit(100),
        supabase.from("dispatches").select("id, status").eq("organization_id", orgId).in("status", ["in_transit", "out_for_delivery", "picked_up"]).limit(100),
        supabase.from("customers").select("id, created_at").eq("organization_id", orgId).gte("created_at", last30).limit(200),
      ]);

      const { data: emps } = await supabase.from("ai_employees").select("id, role_key").eq("user_id", user.id);
      const empMap = Object.fromEntries((emps || []).map(e => [e.role_key, e.id]));

      const overdueAmount = (overdueInvoices || []).reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
      const generated: any[] = [];

      if ((idleVehicles?.length || 0) > 0 && (pendingDispatches?.length || 0) > 0) {
        const trucks = idleVehicles!.length;
        const orders = pendingDispatches!.length;
        generated.push({
          user_id: user.id, role_key: "ops_manager", action_type: "dispatch_creation",
          description: `Proposed dispatch plan for ${Math.min(trucks, orders)} order(s) using ${trucks} idle vehicle(s)`,
          reasoning: `${orders} pending dispatch(es) with ${trucks} available vehicle(s)`,
          impact_summary: `Fleet utilisation lift; ${Math.min(trucks, orders)} order(s) ready to release`,
          confidence_score: 80, revenue_impact: 0, status: "pending",
        });
      }

      if ((overdueInvoices?.length || 0) > 0) {
        generated.push({
          user_id: user.id, role_key: "finance_manager", action_type: "invoice_followup",
          description: `Flagged ₦${Math.round(overdueAmount).toLocaleString()} overdue across ${overdueInvoices!.length} invoice(s)`,
          reasoning: `Invoices past due date (sent/overdue/partial)`,
          impact_summary: `Recoverable receivables: ₦${Math.round(overdueAmount).toLocaleString()}`,
          confidence_score: 88, revenue_impact: overdueAmount, status: "pending",
        });
      }

      if ((inTransit?.length || 0) > 0) {
        generated.push({
          user_id: user.id, role_key: "support_agent", action_type: "client_update",
          description: `Prepared delivery ETA updates for ${inTransit!.length} active dispatch(es)`,
          reasoning: `${inTransit!.length} dispatch(es) currently in transit / out for delivery`,
          impact_summary: `Proactive comms to reduce inbound support load`,
          confidence_score: 92, status: "pending",
        });
      }

      if ((recentCustomers?.length || 0) > 0) {
        generated.push({
          user_id: user.id, role_key: "growth_agent", action_type: "lead_engagement",
          description: `Engagement plan for ${recentCustomers!.length} customer(s) acquired in last 30 days`,
          reasoning: `New customer cohort in last 30 days — upsell window`,
          impact_summary: `Pipeline expansion across recent accounts`,
          confidence_score: 70, status: "pending",
        });
      }

      for (const a of generated) {
        await supabase.from("ai_employee_actions").insert({ ...a, employee_id: empMap[a.role_key] || null });
      }

      return json({
        success: true,
        actions_created: generated.length,
        signals: {
          idle_vehicles: idleVehicles?.length || 0,
          pending_dispatches: pendingDispatches?.length || 0,
          overdue_invoices: overdueInvoices?.length || 0,
          in_transit: inTransit?.length || 0,
          recent_customers: recentCustomers?.length || 0,
        },
      });
    }

    // ─── GET CONFIG ───
    if (route === "/config") {
      const { data, error } = await supabase.from("ai_workforce_config").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return json({ data });
    }

    // ─── UPDATE CONFIG ───
    if (route === "/config/update" && req.method === "POST") {
      const { error } = await supabase.from("ai_workforce_config").upsert({ user_id: user.id, ...body, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      return json({ success: true });
    }

    // ─── HIRING RECOMMENDATIONS ───
    if (route === "/hiring") {
      const { data, error } = await supabase.from("ai_hiring_recommendations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return json({ data });
    }

    // ─── NEGOTIATIONS ───
    if (route === "/negotiations") {
      const { data, error } = await supabase.from("ai_negotiations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return json({ data });
    }

    // ─── EXPANSION ───
    if (route === "/expansion") {
      const { data, error } = await supabase.from("ai_expansion_opportunities").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return json({ data });
    }

    // ─── LEARNING ───
    if (route === "/learning") {
      const { data, error } = await supabase.from("ai_learning_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return json({ data });
    }

    // ─── KPIs ───
    if (route === "/kpis") {
      const { data: actions } = await supabase.from("ai_employee_actions").select("status, revenue_impact, cost_impact").eq("user_id", user.id);
      const pending = (actions || []).filter(a => a.status === "pending").length;
      const executed = (actions || []).filter(a => a.status === "executed").length;
      const approved = (actions || []).filter(a => a.status === "approved").length;
      const totalRevenue = (actions || []).reduce((s, a) => s + (a.revenue_impact || 0), 0);
      const totalCost = (actions || []).reduce((s, a) => s + (a.cost_impact || 0), 0);

      return json({ data: { pending, executed, approved, total_actions: (actions || []).length, revenue_impact: totalRevenue, cost_savings: Math.abs(totalCost), decisions_today: pending + executed + approved } });
    }

    return json({ error: "Unknown route" }, 404);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
