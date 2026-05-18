import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useCommerceIdentity() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const { toast } = useToast();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("commerce-identity-trust", {
        body: { action, ...extra },
      });
      if (error) throw error;
      setData(result);
      return result;
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getOverview = () => invoke("get_identity_overview");
  const computeScores = () => invoke("compute_trust_scores");
  const verifyBusiness = (rcid: string, entityData: any) => invoke("verify_business", { rcid, entity_data: entityData });
  const detectFraud = () => invoke("detect_identity_fraud");
  const getAnalytics = () => invoke("get_trust_analytics");

  return { loading, data, getOverview, computeScores, verifyBusiness, detectFraud, getAnalytics };
}
