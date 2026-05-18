import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TripProfit {
  id: string;
  dispatch_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  route_key: string | null;
  revenue: number;
  fuel_cost: number;
  driver_cost: number;
  maintenance_cost: number;
  toll_cost: number;
  loading_cost: number;
  third_party_cost: number;
  other_cost: number;
  total_cost: number;
  profit: number;
  margin_percent: number;
}

export function useProfitabilityEngine() {
  const tripProfitability = useQuery({
    queryKey: ["trip-profitability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_profitability" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as TripProfit[];
    },
  });

  // Aggregate route profitability from trip data
  const routeProfitability = useQuery({
    queryKey: ["route-profitability", tripProfitability.data],
    queryFn: () => {
      const trips = tripProfitability.data || [];
      const routeMap = new Map<string, { revenue: number; cost: number; count: number }>();
      trips.forEach((t) => {
        if (!t.route_key) return;
        const existing = routeMap.get(t.route_key) || { revenue: 0, cost: 0, count: 0 };
        existing.revenue += Number(t.revenue);
        existing.cost += Number(t.total_cost);
        existing.count += 1;
        routeMap.set(t.route_key, existing);
      });
      return Array.from(routeMap.entries()).map(([route, d]) => ({
        route_key: route,
        total_revenue: d.revenue,
        total_cost: d.cost,
        total_profit: d.revenue - d.cost,
        avg_margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
        trip_count: d.count,
      })).sort((a, b) => b.total_profit - a.total_profit);
    },
    enabled: !!tripProfitability.data,
  });

  // Aggregate driver profitability
  const driverProfitability = useQuery({
    queryKey: ["driver-profitability", tripProfitability.data],
    queryFn: () => {
      const trips = tripProfitability.data || [];
      const driverMap = new Map<string, { revenue: number; cost: number; count: number }>();
      trips.forEach((t) => {
        if (!t.driver_id) return;
        const existing = driverMap.get(t.driver_id) || { revenue: 0, cost: 0, count: 0 };
        existing.revenue += Number(t.revenue);
        existing.cost += Number(t.total_cost);
        existing.count += 1;
        driverMap.set(t.driver_id, existing);
      });
      return Array.from(driverMap.entries()).map(([id, d]) => ({
        driver_id: id,
        total_revenue: d.revenue,
        total_cost: d.cost,
        total_profit: d.revenue - d.cost,
        profit_per_trip: d.count > 0 ? (d.revenue - d.cost) / d.count : 0,
        trip_count: d.count,
      })).sort((a, b) => b.total_profit - a.total_profit);
    },
    enabled: !!tripProfitability.data,
  });

  // Aggregate client profitability
  const clientProfitability = useQuery({
    queryKey: ["client-profitability", tripProfitability.data],
    queryFn: () => {
      const trips = tripProfitability.data || [];
      const clientMap = new Map<string, { revenue: number; cost: number; count: number }>();
      trips.forEach((t) => {
        if (!t.customer_id) return;
        const existing = clientMap.get(t.customer_id) || { revenue: 0, cost: 0, count: 0 };
        existing.revenue += Number(t.revenue);
        existing.cost += Number(t.total_cost);
        existing.count += 1;
        clientMap.set(t.customer_id, existing);
      });
      return Array.from(clientMap.entries()).map(([id, d]) => ({
        customer_id: id,
        total_revenue: d.revenue,
        total_cost: d.cost,
        total_profit: d.revenue - d.cost,
        avg_margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
        trip_count: d.count,
      })).sort((a, b) => b.total_profit - a.total_profit);
    },
    enabled: !!tripProfitability.data,
  });

  // Summary KPIs
  const summary = (() => {
    const trips = tripProfitability.data || [];
    const totalRevenue = trips.reduce((s, t) => s + Number(t.revenue), 0);
    const totalCost = trips.reduce((s, t) => s + Number(t.total_cost), 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const lossTrips = trips.filter((t) => Number(t.profit) < 0).length;
    return { totalRevenue, totalCost, totalProfit, avgMargin, totalTrips: trips.length, lossTrips };
  })();

  return {
    tripProfitability,
    routeProfitability,
    driverProfitability,
    clientProfitability,
    summary,
    isLoading: tripProfitability.isLoading,
  };
}
