import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useGTMCampaigns(osContext: "logistics" | "industry" = "logistics", industryType: string = "logistics") {
  const { user } = useAuth();
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("gtm_campaign_insights" as any)
      .select("*")
      .eq("os_context", osContext)
      .eq("industry_type", industryType)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setInsights(data as any[]);
    setLoading(false);
  }, [user, osContext, industryType]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const addCampaign = useCallback(async (data: any) => {
    if (!user) return;
    const { error } = await supabase.from("gtm_campaign_insights" as any).insert({
      ...data,
      os_context: osContext,
      industry_type: industryType,
    } as any);
    if (error) { toast.error("Failed to save campaign"); return; }
    toast.success("Campaign data saved!");
    await fetchInsights();
  }, [user, osContext, industryType, fetchInsights]);

  return { insights, loading, addCampaign, refetch: fetchInsights };
}
