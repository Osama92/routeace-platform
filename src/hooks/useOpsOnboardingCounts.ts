import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Fetches counts used by the OpsOnboardingChecklist:
 *   fleetCount, vehicleCount, driverCount, dispatchCount, orderCount,
 *   routePlanCount, waybillCount
 * Scoped to the current organization. Live-reactive via Postgres realtime —
 * the checklist ticks in real time as the user completes each step.
 */
export function useOpsOnboardingCounts() {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["ops-onboarding-counts", organizationId];

  const query = useQuery({
    queryKey,
    enabled: !!organizationId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    queryFn: async () => {
      const orgFilter = organizationId!;
      const sb: any = supabase;
      const [vehicles, drivers, dispatches, orders, routePlans, waybills] = await Promise.all([
        sb.from("vehicles").select("id", { count: "exact", head: true }).eq("organization_id", orgFilter),
        sb.from("drivers").select("id", { count: "exact", head: true }).eq("organization_id", orgFilter),
        sb.from("dispatches").select("id", { count: "exact", head: true }).eq("organization_id", orgFilter),
        sb.from("order_inbox").select("id", { count: "exact", head: true }).eq("organization_id", orgFilter),
        sb.from("route_plans").select("id", { count: "exact", head: true }).eq("organization_id", orgFilter),
        sb.from("waybills").select("id", { count: "exact", head: true }).eq("organization_id", orgFilter),
      ]);
      return {
        fleetCount: vehicles.count ?? 0,
        vehicleCount: vehicles.count ?? 0,
        driverCount: drivers.count ?? 0,
        dispatchCount: dispatches.count ?? 0,
        orderCount: orders.count ?? 0,
        routePlanCount: routePlans.count ?? 0,
        waybillCount: waybills.count ?? 0,
      };
    },
  });

  // Live-reactive: refetch counts whenever a relevant table changes for this org.
  useEffect(() => {
    if (!organizationId) return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey });
    const tables = ["vehicles", "drivers", "dispatches", "order_inbox", "route_plans", "waybills"];
    const channel = supabase.channel(`ops-onboarding-${organizationId}`);
    tables.forEach((table) => {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table, filter: `organization_id=eq.${organizationId}` },
        invalidate,
      );
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  return query;
}
