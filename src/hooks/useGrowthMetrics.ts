/**
 * useGrowthMetrics - Aggregates real growth data from profiles, organizations,
 * dispatches, invoices, and user activity. No placeholder data.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export interface GrowthMetrics {
  totalBusinesses: number;
  activeUsers: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  userGrowthRate: number;
  totalDispatches: number;
  dispatchesThisMonth: number;
  totalInvoiceRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowthRate: number;
  totalDrivers: number;
  totalVehicles: number;
  totalCustomers: number;
  viralCoefficient: number;
  isLoading: boolean;
}

export function useGrowthMetrics(): GrowthMetrics {
  const { user } = useAuth();

  const startOfMonth = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.toISOString();
  }, []);

  const startOfLastMonth = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); d.setHours(0,0,0,0); return d.toISOString();
  }, []);

  const { data: orgs = 0, isLoading: l1 } = useQuery({
    queryKey: ["growth-orgs"],
    queryFn: async () => {
      const { count } = await supabase.from("organizations").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: profiles, isLoading: l2 } = useQuery({
    queryKey: ["growth-profiles"],
    queryFn: async () => {
      const { count: total } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: thisMonth } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth);
      const { count: lastMonth } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfLastMonth).lt("created_at", startOfMonth);
      return { total: total || 0, thisMonth: thisMonth || 0, lastMonth: lastMonth || 0 };
    },
    enabled: !!user,
  });

  const { data: dispatches, isLoading: l3 } = useQuery({
    queryKey: ["growth-dispatches"],
    queryFn: async () => {
      const { count: total } = await supabase.from("dispatches").select("*", { count: "exact", head: true });
      const { count: thisMonth } = await supabase.from("dispatches").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth);
      return { total: total || 0, thisMonth: thisMonth || 0 };
    },
    enabled: !!user,
  });

  const { data: revenue, isLoading: l4 } = useQuery({
    queryKey: ["growth-revenue"],
    queryFn: async () => {
      const { data: allInv } = await supabase.from("invoices").select("total_amount, created_at");
      const all = allInv || [];
      const total = all.reduce((s, i) => s + (i.total_amount || 0), 0);
      const thisMonth = all.filter(i => i.created_at >= startOfMonth).reduce((s, i) => s + (i.total_amount || 0), 0);
      const lastMonth = all.filter(i => i.created_at >= startOfLastMonth && i.created_at < startOfMonth).reduce((s, i) => s + (i.total_amount || 0), 0);
      return { total, thisMonth, lastMonth };
    },
    enabled: !!user,
  });

  const { data: counts, isLoading: l5 } = useQuery({
    queryKey: ["growth-counts"],
    queryFn: async () => {
      const [d, v, c] = await Promise.all([
        supabase.from("drivers").select("*", { count: "exact", head: true }),
        supabase.from("vehicles").select("*", { count: "exact", head: true }),
        supabase.from("customers").select("*", { count: "exact", head: true }),
      ]);
      return { drivers: d.count || 0, vehicles: v.count || 0, customers: c.count || 0 };
    },
    enabled: !!user,
  });

  const isLoading = l1 || l2 || l3 || l4 || l5;
  const userGrowthRate = (profiles?.lastMonth || 0) > 0
    ? Math.round(((profiles?.thisMonth || 0) - (profiles?.lastMonth || 0)) / (profiles?.lastMonth || 1) * 100)
    : 0;
  const revenueGrowthRate = (revenue?.lastMonth || 0) > 0
    ? Math.round(((revenue?.thisMonth || 0) - (revenue?.lastMonth || 0)) / (revenue?.lastMonth || 1) * 100)
    : 0;

  // Viral coefficient: new users this month per existing user (simplified)
  const existingUsers = Math.max(1, (profiles?.total || 1) - (profiles?.thisMonth || 0));
  const viralCoefficient = existingUsers > 0 ? Number(((profiles?.thisMonth || 0) / existingUsers).toFixed(2)) : 0;

  return {
    totalBusinesses: orgs,
    activeUsers: profiles?.total || 0,
    newUsersThisMonth: profiles?.thisMonth || 0,
    newUsersLastMonth: profiles?.lastMonth || 0,
    userGrowthRate,
    totalDispatches: dispatches?.total || 0,
    dispatchesThisMonth: dispatches?.thisMonth || 0,
    totalInvoiceRevenue: revenue?.total || 0,
    revenueThisMonth: revenue?.thisMonth || 0,
    revenueLastMonth: revenue?.lastMonth || 0,
    revenueGrowthRate,
    totalDrivers: counts?.drivers || 0,
    totalVehicles: counts?.vehicles || 0,
    totalCustomers: counts?.customers || 0,
    viralCoefficient,
    isLoading,
  };
}
