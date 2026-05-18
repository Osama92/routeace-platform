import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns true when the current tenant has an active billing account
 * with a non-null plan_id. Treats super_admin as paid for previewing
 * locked Hub modules without billing setup.
 */
export function useIsPaidPlan() {
  const { user, hasRole } = useAuth();
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) {
        setIsPaid(false);
        setLoading(false);
        return;
      }
      // Super admin always sees as paid (preview/governance)
      if (hasRole("super_admin")) {
        setIsPaid(true);
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("billing_accounts")
          .select("id, plan_id, status")
          .eq("status", "active")
          .not("plan_id", "is", null)
          .limit(1)
          .maybeSingle();
        if (!cancelled) setIsPaid(!!data);
      } catch {
        if (!cancelled) setIsPaid(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [user, hasRole]);

  return { isPaid, loading };
}

export default useIsPaidPlan;
