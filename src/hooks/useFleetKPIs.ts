import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FleetKPIs {
  // Downtime & Availability
  totalFleet: number;
  daysAvailableThisMonth: number;
  daysInMonth: number;
  downtimeHealth: "good" | "warning" | "critical";
  uptimePct: number;
  vehiclesDown: number;

  // TTR / MTTR
  mttrHours: number;
  mttrRating: "world_class" | "average" | "needs_improvement";
  totalRepairsCompleted: number;
  totalDowntimeHours: number;
  repairsWithin48hPct: number;
  repeatRepairPct: number;

  // Cost
  totalMaintenanceCost: number;
  avgCostPerVehicle: number;
  avgCostPerKm: number;
  avgCostPerDelivery: number;

  // Operational
  utilizationRate: number;
  idleTimePct: number;
  avgFuelLevel: number;

  // Maintenance
  pmCompliancePct: number;
  scheduledVsUnscheduledRatio: number;
  mtbfHours: number;

  // Safety / Driver
  avgDriverScore: number;
  dvirCompliancePct: number;
  onTimeDeliveryPct: number;
  firstAttemptPct: number;

  // Raw data
  maintenanceOrders: any[];
  availabilityLogs: any[];
  driverScores: any[];
  fleetVehicles: any[];
  dispatches: any[];
}

/**
 * Tenant-scoped Fleet KPIs.
 *
 * Reads from canonical tables (RLS auto-filters by organization_id):
 *  - vehicles                 → fleet roster, fuel, health, weekly/monthly km
 *  - fleet_availability_log   → daily availability snapshots
 *  - fleet_maintenance_orders → repairs / PM / costs / repair hours
 *  - fleet_driver_scores      → driver behaviour + delivery success
 *  - dispatches               → completed deliveries (for cost-per-delivery)
 *
 * When the tenant has no fleet, all derived ratios fall back to 0 (not 100).
 * Callers must check `kpis.totalFleet === 0` to render an empty state.
 */
export const useFleetKPIs = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<FleetKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  const calculate = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthStartTs = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const [fleetRes, maintRes, availRes, driverRes, dispRes] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id, registration_number, status, current_fuel_level, health_score, weekly_km, monthly_km, last_maintenance, next_maintenance"),
      supabase
        .from("fleet_maintenance_orders")
        .select("id, vehicle_id, order_type, status, downtime_hours, repair_hours, parts_cost, labor_cost, created_at, completed_at, started_at")
        .gte("created_at", monthStartTs)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("fleet_availability_log")
        .select("log_date, total_vehicles, available_count, on_trip_count, maintenance_count, availability_pct")
        .gte("log_date", monthStart)
        .order("log_date", { ascending: false }),
      supabase
        .from("fleet_driver_scores")
        .select("driver_name, overall_score, deliveries_completed, deliveries_on_time, first_attempt_success, dvir_completed")
        .gte("score_date", monthStart),
      supabase
        .from("dispatches")
        .select("id, status, on_time_flag, total_distance_km, cost")
        .gte("created_at", monthStartTs)
        .limit(500),
    ]);

    const fleet = fleetRes.data || [];
    const maint = maintRes.data || [];
    const availability = availRes.data || [];
    const drivers = driverRes.data || [];
    const dispatches = dispRes.data || [];

    const totalFleet = fleet.length;

    // === Availability / Uptime ===
    // Prefer real daily snapshots; fall back to current vehicle status.
    let uptimePct = 0;
    let avgDaysAvailable = 0;
    let vehiclesDown = fleet.filter((v: any) => v.status === "maintenance").length;

    if (totalFleet === 0) {
      uptimePct = 0;
      avgDaysAvailable = 0;
    } else if (availability.length > 0) {
      const avgPct = availability.reduce((s, a: any) => s + Number(a.availability_pct || 0), 0) / availability.length;
      uptimePct = Math.round(avgPct);
      avgDaysAvailable = Math.round((avgPct / 100) * Math.min(availability.length, daysInMonth));
      // Most recent snapshot wins for "down now"
      const latest = availability[0];
      if (latest) vehiclesDown = Number(latest.maintenance_count || vehiclesDown);
    } else {
      // No daily snapshots logged yet - derive from current status only.
      const operational = fleet.filter((v: any) => v.status !== "maintenance" && v.status !== "retired").length;
      uptimePct = Math.round((operational / totalFleet) * 100);
      avgDaysAvailable = 0; // unknown without history
    }

    const downtimeHealth: "good" | "warning" | "critical" =
      avgDaysAvailable === 0 ? "critical" : avgDaysAvailable >= 24 ? "good" : avgDaysAvailable >= 20 ? "warning" : "critical";

    // === TTR / MTTR ===
    const completedRepairs = maint.filter((m: any) => m.status === "completed" && m.repair_hours != null);
    const totalRepairHours = completedRepairs.reduce((s: number, m: any) => s + Number(m.repair_hours || 0), 0);
    const mttrHours = completedRepairs.length > 0 ? Math.round((totalRepairHours / completedRepairs.length) * 10) / 10 : 0;
    const mttrRating: "world_class" | "average" | "needs_improvement" =
      completedRepairs.length === 0 ? "needs_improvement" : mttrHours < 2 ? "world_class" : mttrHours <= 8 ? "average" : "needs_improvement";

    const totalDowntimeHours = completedRepairs.reduce((s: number, m: any) => s + Number(m.downtime_hours || 0), 0);
    const repairsWithin48h = completedRepairs.filter((m: any) => Number(m.downtime_hours || 0) <= 48).length;
    const repairsWithin48hPct = completedRepairs.length > 0
      ? Math.round((repairsWithin48h / completedRepairs.length) * 100) : 0;

    // Repeat repair: same vehicle, same failure type, more than once this month
    const failureKeyCounts: Record<string, number> = {};
    maint.forEach((m: any) => {
      const k = `${m.vehicle_id}|${m.order_type}`;
      failureKeyCounts[k] = (failureKeyCounts[k] || 0) + 1;
    });
    const repeatRepairs = Object.values(failureKeyCounts).filter(c => c > 1).length;
    const repeatRepairPct = maint.length > 0 ? Math.round((repeatRepairs / maint.length) * 1000) / 10 : 0;

    // === Cost ===
    const totalMaintenanceCost = maint.reduce(
      (s: number, m: any) => s + Number(m.parts_cost || 0) + Number(m.labor_cost || 0), 0,
    );
    const avgCostPerVehicle = totalFleet > 0 ? Math.round(totalMaintenanceCost / totalFleet) : 0;

    const totalKm = fleet.reduce((s: number, f: any) => s + Number(f.monthly_km || 0), 0);
    const totalDeliveries = dispatches.filter((d: any) => d.status === "completed" || d.status === "delivered").length;
    const avgCostPerKm = totalKm > 0 ? Math.round((totalMaintenanceCost / totalKm) * 100) / 100 : 0;
    const avgCostPerDelivery = totalDeliveries > 0 ? Math.round(totalMaintenanceCost / totalDeliveries) : 0;

    // === Operational ===
    const inUseVehicles = fleet.filter((v: any) => v.status === "in_use").length;
    const utilizationRate = totalFleet > 0 ? Math.round((inUseVehicles / totalFleet) * 100) : 0;
    const idleVehicles = fleet.filter((v: any) => v.status === "available").length;
    const idleTimePct = totalFleet > 0 ? Math.round((idleVehicles / totalFleet) * 100) : 0;
    const avgFuelLevel = totalFleet > 0
      ? Math.round(fleet.reduce((s: number, f: any) => s + Number(f.current_fuel_level || 0), 0) / totalFleet)
      : 0;

    // === Maintenance KPIs ===
    const preventive = maint.filter((m: any) => m.order_type === "preventive");
    const pmCompleted = preventive.filter((m: any) => m.status === "completed").length;
    const pmCompliancePct = preventive.length > 0 ? Math.round((pmCompleted / preventive.length) * 100) : 0;
    const scheduled = maint.filter((m: any) => m.order_type === "preventive" || m.order_type === "inspection").length;
    const unscheduled = maint.filter((m: any) => m.order_type === "corrective" || m.order_type === "emergency").length;
    const scheduledVsUnscheduledRatio = unscheduled > 0
      ? Math.round((scheduled / unscheduled) * 100) / 100
      : scheduled > 0 ? scheduled : 0;

    const failures = unscheduled;
    const totalOpHours = totalFleet * Math.max(avgDaysAvailable, 0) * 12;
    const mtbfHours = failures > 0 && totalOpHours > 0 ? Math.round(totalOpHours / failures) : 0;

    // === Driver KPIs ===
    const avgDriverScore = drivers.length > 0
      ? Math.round(drivers.reduce((s: number, d: any) => s + Number(d.overall_score || 0), 0) / drivers.length)
      : 0;
    const dvirCompleted = drivers.filter((d: any) => d.dvir_completed).length;
    const dvirCompliancePct = drivers.length > 0 ? Math.round((dvirCompleted / drivers.length) * 100) : 0;

    const totalDriverDeliveries = drivers.reduce((s: number, d: any) => s + Number(d.deliveries_completed || 0), 0);
    const totalOnTime = drivers.reduce((s: number, d: any) => s + Number(d.deliveries_on_time || 0), 0);
    const totalFirstAttempt = drivers.reduce((s: number, d: any) => s + Number(d.first_attempt_success || 0), 0);
    const onTimeDeliveryPct = totalDriverDeliveries > 0 ? Math.round((totalOnTime / totalDriverDeliveries) * 100) : 0;
    const firstAttemptPct = totalDriverDeliveries > 0 ? Math.round((totalFirstAttempt / totalDriverDeliveries) * 100) : 0;

    setKpis({
      totalFleet,
      daysAvailableThisMonth: avgDaysAvailable,
      daysInMonth,
      downtimeHealth,
      uptimePct,
      vehiclesDown,
      mttrHours,
      mttrRating,
      totalRepairsCompleted: completedRepairs.length,
      totalDowntimeHours: Math.round(totalDowntimeHours * 10) / 10,
      repairsWithin48hPct,
      repeatRepairPct,
      totalMaintenanceCost,
      avgCostPerVehicle,
      avgCostPerKm,
      avgCostPerDelivery,
      utilizationRate,
      idleTimePct,
      avgFuelLevel,
      pmCompliancePct,
      scheduledVsUnscheduledRatio,
      mtbfHours,
      avgDriverScore,
      dvirCompliancePct,
      onTimeDeliveryPct,
      firstAttemptPct,
      maintenanceOrders: maint,
      availabilityLogs: availability,
      driverScores: drivers,
      fleetVehicles: fleet,
      dispatches,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { calculate(); }, [calculate]);

  return { kpis, loading, refetch: calculate };
};
