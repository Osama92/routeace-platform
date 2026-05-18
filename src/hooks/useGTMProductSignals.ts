import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useGTMProductSignals(osContext: "logistics" | "industry" = "industry", industryType: string = "fmcg") {
  const { user } = useAuth();
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("gtm_product_signals" as any)
      .select("*")
      .eq("os_context", osContext)
      .eq("industry_type", industryType)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setSignals(data as any[]);
    setLoading(false);
  }, [user, osContext, industryType]);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  const addProductSignal = useCallback(async (data: any) => {
    if (!user) return;
    const { error } = await supabase.from("gtm_product_signals" as any).insert({
      ...data,
      os_context: osContext,
      industry_type: industryType,
    } as any);
    if (error) { toast.error("Failed to save product signal"); return; }
    toast.success("Product signal recorded!");
    await fetchSignals();
  }, [user, osContext, industryType, fetchSignals]);

  return { signals, loading, addProductSignal, refetch: fetchSignals };
}
