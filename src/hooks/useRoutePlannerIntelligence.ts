import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RoutePlannerLive {
  empty: boolean;
  heavyKpi: Array<{ label: string; value: number; unit: string; desc: string; color: string }>;
  longHaul: Array<{ route: string; restStops: number; fuelStops: number; overnight: number; borderChecks: number; est: string }>;
  aiScores: Array<{ label: string; desc: string; score: number; color: string }>;
  heavyRoutes: Array<{ label: string; score: number; trips: number; delay: string; mode: string }>;
  whatIfScenarios: Array<{ label: string; impact: string; positive: boolean }>;
  counts?: { dispatches: number; vehicles: number; trips: number };
  generatedAt?: string;
}

export function useRoutePlannerIntelligence() {
  return useQuery<RoutePlannerLive>({
    queryKey: ["route-planner-intelligence"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("route-planner-intelligence");
      if (error) throw error;
      return data as RoutePlannerLive;
    },
    staleTime: 5 * 60 * 1000,
  });
}
