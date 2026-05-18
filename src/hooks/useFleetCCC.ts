import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FleetCCCData {
  ccc: { value: number; isNegative: boolean; trend: string };
  dso: { value: number; totalAR: number; arAging: { current: number; days30: number; days60: number; days90plus: number } };
  dpo: { value: number; totalAP: number; byCategory: Record<string, { total: number; count: number }> };
  dio: { value: number; avgInventory: number };
  revenue: { total: number; cogs: number };
  liquidityScore: number;
  benchmark: { regionalAvg: number; advantage: number; advantageLabel: string };
  trend: Array<{ month: string; ccc: number; dso: number; dpo: number; dio: number }>;
  recommendations: Array<{ title: string; description: string; impact: string; category: string; estimatedImprovement: string }>;
  overdueClients: Array<{ balance: number; due_date: string; status: string }>;
  calculatedAt: string;
}

export function useFleetCCC() {
  return useQuery<FleetCCCData>({
    queryKey: ["fleet-ccc"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fleet-ccc-engine");
      if (error) throw error;
      return data as FleetCCCData;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}
