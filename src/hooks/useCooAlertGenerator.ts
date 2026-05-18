import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Runs once per session for org_admin users. Reads from real platform data and
 * seeds coo_ai_alerts. Skips inserting an identical alert (alert_type + reference_id)
 * already created today.
 */
export const useCooAlertGenerator = (orgId: string | null) => {
  const ranRef = useRef(false);

  useEffect(() => {
    if (!orgId || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const today = new Date().toISOString().split("T")[0];

        const existsToday = async (alert_type: string, reference_id: string | null) => {
          const q = supabase
            .from("coo_ai_alerts")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("alert_type", alert_type)
            .gte("created_at", `${today}T00:00:00Z`);
          if (reference_id) q.eq("reference_id", reference_id);
          const { count } = await q;
          return (count ?? 0) > 0;
        };

        const insertAlert = async (row: any) => {
          if (await existsToday(row.alert_type, row.reference_id ?? null)) return;
          await supabase.from("coo_ai_alerts").insert({ ...row, organization_id: orgId });
        };

        // 1) SLA breach risk
        const twoHrs = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
        const { data: slaDispatches } = await supabase
          .from("dispatches")
          .select("id, dispatch_number, scheduled_delivery, status")
          .eq("organization_id", orgId)
          .eq("status", "in_transit")
          .lte("scheduled_delivery", twoHrs)
          .limit(20);

        for (const d of slaDispatches ?? []) {
          await insertAlert({
            alert_type: "sla_breach_risk",
            severity: "warning",
            title: `SLA breach risk: ${d.dispatch_number}`,
            message: `Dispatch ${d.dispatch_number} is at risk of missing its delivery window.`,
            confidence_score: 85,
            financial_impact: 0,
            reference_type: "dispatch",
            reference_id: d.id,
            recommended_action: "Reroute or notify customer proactively.",
          });
        }

        // 2) Maintenance due (vehicles in this org with next_maintenance ≤ 7 days)
        const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: vehicles } = await supabase
          .from("vehicles")
          .select("id, registration_number, next_maintenance, status")
          .eq("organization_id", orgId)
          .eq("status", "active")
          .lte("next_maintenance", in7days)
          .limit(20);

        for (const v of vehicles ?? []) {
          await insertAlert({
            alert_type: "maintenance_due",
            severity: "warning",
            title: `Maintenance due: ${v.registration_number}`,
            message: `Vehicle ${v.registration_number} service is due within 7 days.`,
            confidence_score: 100,
            reference_type: "vehicle",
            reference_id: v.id,
            recommended_action: "Schedule preventive service this week.",
          });
        }

        // 3) Large pending payouts (> ₦1,000,000)
        const { data: bigPayouts } = await supabase
          .from("payout_approvals")
          .select("id, amount, payout_type")
          .eq("organization_id", orgId)
          .eq("status", "pending_org_admin")
          .gt("amount", 1_000_000)
          .limit(20);

        for (const p of bigPayouts ?? []) {
          await insertAlert({
            alert_type: "payment_anomaly",
            severity: "critical",
            title: "Large payout awaiting your approval",
            message: `₦${Number(p.amount).toLocaleString("en-NG")} payout is pending your approval before it can proceed.`,
            confidence_score: 100,
            financial_impact: p.amount,
            reference_type: "payout",
            reference_id: p.id,
            recommended_action: "Review payout details and approve or reject.",
          });
        }

        // 4) Driver shortage - overlapping approved leave next 3 days vs active drivers
        const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const todayStr = new Date().toISOString().split("T")[0];

        const [{ data: leaves }, { count: activeDrivers }] = await Promise.all([
          supabase
            .from("leave_requests")
            .select("id, start_date, end_date")
            .eq("organization_id", orgId)
            .eq("status", "approved")
            .lte("start_date", in3days)
            .gte("end_date", todayStr),
          supabase
            .from("drivers")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("status", "active"),
        ]);

        const onLeave = leaves?.length ?? 0;
        if (activeDrivers && activeDrivers > 0 && onLeave / activeDrivers > 0.3) {
          await insertAlert({
            alert_type: "driver_performance",
            severity: "critical",
            title: "Driver shortage alert",
            message: `${onLeave} drivers are on approved leave in the next 3 days. Review dispatch capacity.`,
            confidence_score: 95,
            reference_type: "driver",
            reference_id: null,
            recommended_action: "Reassign routes or hire temporary drivers.",
          });
        }
      } catch (e) {
        // silent - alert generation must never block UI
        console.warn("[useCooAlertGenerator]", e);
      }
    })();
  }, [orgId]);
};

export default useCooAlertGenerator;
