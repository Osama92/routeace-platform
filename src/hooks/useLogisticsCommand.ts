import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useLogisticsCommand = () => {
  const { user } = useAuth();
  const [fleet, setFleet] = useState<any[]>([]);
  const [deliveryTracking, setDeliveryTracking] = useState<any[]>([]);
  const [routePlans, setRoutePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [fleetRes, trackingRes, routeRes] = await Promise.all([
      supabase.from("fmcg_fleet_tracking").select("*").order("updated_at", { ascending: false }),
      supabase.from("order_delivery_tracking").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("fmcg_route_plans").select("*").order("route_date", { ascending: false }).limit(20),
    ]);

    if (fleetRes.data) setFleet(fleetRes.data);
    if (trackingRes.data) setDeliveryTracking(trackingRes.data);
    if (routeRes.data) setRoutePlans(routeRes.data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Update fleet status
  const updateVehicleStatus = async (vehicleId: string, status: string) => {
    const { error } = await supabase.from("fmcg_fleet_tracking").update({
      current_status: status,
      updated_at: new Date().toISOString(),
    }).eq("id", vehicleId);
    if (error) { toast.error("Failed to update status"); return; }
    toast.success(`Vehicle status updated to ${status}`);
    await fetchAll();
  };

  // Resolve a delivery exception
  const resolveDeliveryIssue = async (trackingId: string, stage: string) => {
    const { error } = await supabase.from("order_delivery_tracking").update({
      stage,
      updated_at: new Date().toISOString(),
    }).eq("id", trackingId);
    if (error) { toast.error("Failed to resolve"); return; }
    toast.success("Issue resolved!");
    await fetchAll();
  };

  const activeVehicles = fleet.filter(f => f.current_status === "en_route");
  const idleVehicles = fleet.filter(f => f.current_status === "idle");
  const maintenanceVehicles = fleet.filter(f => f.current_status === "maintenance");
  const loadingVehicles = fleet.filter(f => f.current_status === "loading");
  const completedDeliveries = deliveryTracking.filter(d => d.status === "delivered");
  const delayedDeliveries = deliveryTracking.filter(d => d.delay_risk_score && d.delay_risk_score > 50);
  const avgFuel = fleet.length > 0 ? Math.round(fleet.reduce((s, f) => s + (f.fuel_level_pct || 0), 0) / fleet.length) : 0;

  return {
    fleet, deliveryTracking, routePlans, loading,
    updateVehicleStatus, resolveDeliveryIssue, refetch: fetchAll,
    kpis: {
      totalFleet: fleet.length,
      activeCount: activeVehicles.length,
      idleCount: idleVehicles.length,
      maintenanceCount: maintenanceVehicles.length,
      loadingCount: loadingVehicles.length,
      completedDeliveries: completedDeliveries.length,
      delayedCount: delayedDeliveries.length,
      totalDeliveries: deliveryTracking.length,
      avgFuelLevel: avgFuel,
    },
    activeVehicles,
    delayedDeliveries,
  };
};
