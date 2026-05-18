/**
 * useUsageMetering - Tracks tenant usage and triggers upgrade prompts.
 * Connects pricing engine to real-time enforcement.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { checkUpgradeTriggers, type UpgradeTrigger } from "@/lib/pricing/estimator";

export interface UsageMetrics {
  vehicleCount: number;
  driverCount: number;
  monthlyDispatches: number;
  activeUsers: number;
  aiCreditsUsed: number;
  aiCreditsTotal: number;
  aiCreditsRemaining: number;
  aiUsagePercent: number;
  isLoading: boolean;
}

export interface UsageMeteringResult {
  metrics: UsageMetrics;
  upgradeTriggers: UpgradeTrigger[];
  hasUpgradeRecommendation: boolean;
  topTrigger: UpgradeTrigger | null;
  isLoading: boolean;
}

export function useUsageMetering(): UsageMeteringResult {
  const { user } = useAuth();
  const { config, isLoading: configLoading } = useTenantConfig();

  // Fetch vehicle count
  const { data: vehicleCount = 0, isLoading: vehiclesLoading } = useQuery({
    queryKey: ["usage-vehicles", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("vehicles").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: !!user,
  });

  // Fetch driver count
  const { data: driverCount = 0, isLoading: driversLoading } = useQuery({
    queryKey: ["usage-drivers", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("drivers").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: !!user,
  });

  // Fetch monthly dispatches
  const { data: monthlyDispatches = 0, isLoading: dispatchesLoading } = useQuery({
    queryKey: ["usage-dispatches-monthly", user?.id],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("dispatches")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());
      return count || 0;
    },
    enabled: !!user,
  });

  const isLoading = configLoading || vehiclesLoading || driversLoading || dispatchesLoading;

  const aiCreditsTotal = config?.ai_credits_total || 0;
  const aiCreditsUsed = config?.ai_credits_used || 0;
  const aiCreditsRemaining = Math.max(0, aiCreditsTotal - aiCreditsUsed);
  const aiUsagePercent = aiCreditsTotal > 0 ? Math.round((aiCreditsUsed / aiCreditsTotal) * 100) : 0;

  const metrics: UsageMetrics = {
    vehicleCount,
    driverCount,
    monthlyDispatches,
    activeUsers: 1, // placeholder - would come from org members
    aiCreditsUsed,
    aiCreditsTotal,
    aiCreditsRemaining,
    aiUsagePercent,
    isLoading,
  };

  const upgradeTriggers = useMemo(() => {
    if (isLoading || !config) return [];
    const plan = config.plan_tier || "free";
    const os = (config.operating_model === "haulage" || config.operating_model === "multidrop" || config.operating_model === "hybrid")
      ? "logistics" as const
      : "logistics" as const;

    return checkUpgradeTriggers({
      os,
      currentPlan: plan,
      vehicleCount,
      monthlyDeliveries: monthlyDispatches,
      userCount: 1,
      outletCount: 0,
      aiCreditsUsed,
      aiCreditsIncluded: aiCreditsTotal,
    });
  }, [isLoading, config, vehicleCount, monthlyDispatches, aiCreditsUsed, aiCreditsTotal]);

  return {
    metrics,
    upgradeTriggers,
    hasUpgradeRecommendation: upgradeTriggers.length > 0,
    topTrigger: upgradeTriggers[0] || null,
    isLoading,
  };
}
