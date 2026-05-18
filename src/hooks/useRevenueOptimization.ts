import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export interface RouteProfitMetric {
  route_key: string;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  avg_margin: number;
  trip_count: number;
  is_underpriced: boolean;
}

export interface ClientProfitSummary {
  customer_id: string;
  customer_name: string;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  avg_margin: number;
  trip_count: number;
  classification: "high_value" | "standard" | "low_margin" | "loss_making";
}

export interface PricingRecommendation {
  route_hash: string;
  base_price: number;
  recommended_price: number;
  minimum_price: number;
  demand_multiplier: number;
  fuel_multiplier: number;
  margin_target: number;
}

export interface RevenueKPIs {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMargin: number;
  totalTrips: number;
  lossTrips: number;
  underpricedRoutes: number;
  lowMarginClients: number;
  avgRevenuePerTrip: number;
  avgCostPerTrip: number;
}

function classifyClient(margin: number): ClientProfitSummary["classification"] {
  if (margin >= 30) return "high_value";
  if (margin >= 15) return "standard";
  if (margin >= 0) return "low_margin";
  return "loss_making";
}

export function useRevenueOptimization() {
  // Fetch dispatches with cost + revenue data
  const { data: dispatches, isLoading: dispatchLoading } = useQuery({
    queryKey: ["rev-opt-dispatches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dispatches")
        .select("id, customer_id, pickup_address, delivery_address, cost, distance_km, vehicle_id, driver_id, status, created_at")
        .in("status", ["delivered", "closed"])
        .order("created_at", { ascending: false })
        .limit(1000);
      return data || [];
    },
    staleTime: 60_000,
  });

  // Fetch invoices for revenue
  const { data: invoices, isLoading: invoiceLoading } = useQuery({
    queryKey: ["rev-opt-invoices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, dispatch_id, total_amount, amount, tax_amount, status")
        .in("status", ["pending", "paid"])
        .limit(1000);
      return data || [];
    },
    staleTime: 60_000,
  });

  // Fetch expenses for cost attribution
  const { data: expenses, isLoading: expenseLoading } = useQuery({
    queryKey: ["rev-opt-expenses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("id, dispatch_id, amount, category")
        .not("dispatch_id", "is", null)
        .limit(1000);
      return data || [];
    },
    staleTime: 60_000,
  });

  // Fetch customers for names
  const { data: customers } = useQuery({
    queryKey: ["rev-opt-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, company_name").limit(500);
      return data || [];
    },
    staleTime: 300_000,
  });

  // Fetch fuel index
  const { data: fuelData } = useQuery({
    queryKey: ["fuel-index"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fuel_index")
        .select("*")
        .order("effective_date", { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 300_000,
  });

  // Fetch pricing adjustments
  const { data: pricingAdj } = useQuery({
    queryKey: ["pricing-adjustments"],
    queryFn: async () => {
      const { data } = await supabase.from("pricing_adjustments").select("*").limit(200);
      return data || [];
    },
    staleTime: 60_000,
  });

  const isLoading = dispatchLoading || invoiceLoading || expenseLoading;

  // Build invoice lookup by dispatch_id
  const invoiceMap = useMemo(() => {
    const map = new Map<string, number>();
    (invoices || []).forEach((inv: any) => {
      if (inv.dispatch_id) map.set(inv.dispatch_id, Number(inv.total_amount || inv.amount || 0));
    });
    return map;
  }, [invoices]);

  // Build expense lookup by dispatch_id
  const expenseMap = useMemo(() => {
    const map = new Map<string, number>();
    (expenses || []).forEach((exp: any) => {
      if (exp.dispatch_id) {
        map.set(exp.dispatch_id, (map.get(exp.dispatch_id) || 0) + Number(exp.amount || 0));
      }
    });
    return map;
  }, [expenses]);

  // Customer name lookup
  const customerNames = useMemo(() => {
    const map = new Map<string, string>();
    (customers || []).forEach((c: any) => map.set(c.id, c.company_name || "Unknown"));
    return map;
  }, [customers]);

  // Route profitability
  const routeProfitability = useMemo<RouteProfitMetric[]>(() => {
    const routeMap = new Map<string, { revenue: number; cost: number; count: number }>();
    (dispatches || []).forEach((d: any) => {
      const key = `${(d.pickup_address || "").split(",")[0]} → ${(d.delivery_address || "").split(",")[0]}`;
      const revenue = invoiceMap.get(d.id) || Number(d.cost || 0);
      const cost = expenseMap.get(d.id) || revenue * 0.65; // fallback cost estimate
      const existing = routeMap.get(key) || { revenue: 0, cost: 0, count: 0 };
      existing.revenue += revenue;
      existing.cost += cost;
      existing.count += 1;
      routeMap.set(key, existing);
    });
    return Array.from(routeMap.entries())
      .map(([key, d]) => ({
        route_key: key,
        total_revenue: d.revenue,
        total_cost: d.cost,
        total_profit: d.revenue - d.cost,
        avg_margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
        trip_count: d.count,
        is_underpriced: d.revenue > 0 && ((d.revenue - d.cost) / d.revenue) * 100 < 15,
      }))
      .sort((a, b) => b.total_profit - a.total_profit);
  }, [dispatches, invoiceMap, expenseMap]);

  // Client profitability
  const clientProfitability = useMemo<ClientProfitSummary[]>(() => {
    const clientMap = new Map<string, { revenue: number; cost: number; count: number }>();
    (dispatches || []).forEach((d: any) => {
      if (!d.customer_id) return;
      const revenue = invoiceMap.get(d.id) || Number(d.cost || 0);
      const cost = expenseMap.get(d.id) || revenue * 0.65;
      const existing = clientMap.get(d.customer_id) || { revenue: 0, cost: 0, count: 0 };
      existing.revenue += revenue;
      existing.cost += cost;
      existing.count += 1;
      clientMap.set(d.customer_id, existing);
    });
    return Array.from(clientMap.entries())
      .map(([id, d]) => {
        const margin = d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0;
        return {
          customer_id: id,
          customer_name: customerNames.get(id) || "Unknown",
          total_revenue: d.revenue,
          total_cost: d.cost,
          total_profit: d.revenue - d.cost,
          avg_margin: margin,
          trip_count: d.count,
          classification: classifyClient(margin),
        };
      })
      .sort((a, b) => b.total_profit - a.total_profit);
  }, [dispatches, invoiceMap, expenseMap, customerNames]);

  // Margin trend by month
  const marginTrend = useMemo(() => {
    const monthMap = new Map<string, { revenue: number; cost: number; count: number }>();
    (dispatches || []).forEach((d: any) => {
      const month = (d.created_at || "").substring(0, 7);
      if (!month) return;
      const revenue = invoiceMap.get(d.id) || Number(d.cost || 0);
      const cost = expenseMap.get(d.id) || revenue * 0.65;
      const existing = monthMap.get(month) || { revenue: 0, cost: 0, count: 0 };
      existing.revenue += revenue;
      existing.cost += cost;
      existing.count += 1;
      monthMap.set(month, existing);
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month,
        revenue: d.revenue,
        cost: d.cost,
        profit: d.revenue - d.cost,
        margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
        trips: d.count,
      }));
  }, [dispatches, invoiceMap, expenseMap]);

  // KPIs
  const kpis = useMemo<RevenueKPIs>(() => {
    const totalRevenue = routeProfitability.reduce((s, r) => s + r.total_revenue, 0);
    const totalCost = routeProfitability.reduce((s, r) => s + r.total_cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const totalTrips = routeProfitability.reduce((s, r) => s + r.trip_count, 0);
    const lossTrips = routeProfitability.filter(r => r.total_profit < 0).length;
    const underpricedRoutes = routeProfitability.filter(r => r.is_underpriced).length;
    const lowMarginClients = clientProfitability.filter(c => c.classification === "low_margin" || c.classification === "loss_making").length;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      avgMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      totalTrips,
      lossTrips,
      underpricedRoutes,
      lowMarginClients,
      avgRevenuePerTrip: totalTrips > 0 ? totalRevenue / totalTrips : 0,
      avgCostPerTrip: totalTrips > 0 ? totalCost / totalTrips : 0,
    };
  }, [routeProfitability, clientProfitability]);

  // Get price recommendation for a route
  const getRecommendation = (pickup: string, delivery: string): PricingRecommendation | null => {
    const routeKey = `${(pickup || "").split(",")[0]} → ${(delivery || "").split(",")[0]}`;
    const route = routeProfitability.find(r => r.route_key === routeKey);
    if (!route || route.trip_count === 0) return null;

    const avgRevenue = route.total_revenue / route.trip_count;
    const avgCost = route.total_cost / route.trip_count;
    const targetMargin = 0.20;
    const minMargin = 0.10;

    const fuelPrice = fuelData?.[0]?.fuel_price_per_liter || 700;
    const fuelMultiplier = fuelPrice > 600 ? 1 + ((fuelPrice - 600) / 600) * 0.1 : 1;
    const demandMultiplier = route.trip_count > 20 ? 1.1 : route.trip_count > 10 ? 1.05 : 1;

    const recommended = Math.max(avgCost / (1 - targetMargin), avgRevenue) * demandMultiplier * fuelMultiplier;
    const minimum = avgCost / (1 - minMargin);

    return {
      route_hash: routeKey,
      base_price: avgRevenue,
      recommended_price: Math.round(recommended),
      minimum_price: Math.round(minimum),
      demand_multiplier: demandMultiplier,
      fuel_multiplier: fuelMultiplier,
      margin_target: targetMargin * 100,
    };
  };

  return {
    kpis,
    routeProfitability,
    clientProfitability,
    marginTrend,
    fuelIndex: fuelData || [],
    pricingAdjustments: pricingAdj || [],
    getRecommendation,
    isLoading,
  };
}
