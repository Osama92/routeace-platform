import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FMCGRole =
  | "strategic_leadership"
  | "regional_sales_manager"
  | "area_sales_manager"
  | "sales_supervisor"
  | "sales_representative"
  | "merchandiser"
  | "distributor"
  | "warehouse_manager"
  | "finance_manager"
  | "logistics_coordinator";

export const FMCG_ROLE_LABELS: Record<FMCGRole, string> = {
  strategic_leadership: "Strategic Leadership (CEO/CSO/CFO)",
  regional_sales_manager: "Regional Sales Manager",
  area_sales_manager: "Area Sales Manager",
  sales_supervisor: "Sales Supervisor",
  sales_representative: "Sales Representative",
  merchandiser: "Merchandiser",
  distributor: "Distributor",
  warehouse_manager: "Warehouse Manager",
  finance_manager: "Finance Manager",
  logistics_coordinator: "Logistics Coordinator",
};

export const FMCG_ROLE_DESCRIPTIONS: Record<FMCGRole, string> = {
  strategic_leadership: "Full platform access - national KPIs, intelligence, financing",
  regional_sales_manager: "Regional analytics, rep performance, distributor management",
  area_sales_manager: "Area-level sales execution, retailer oversight",
  sales_supervisor: "Team supervision, visit compliance, daily targets",
  sales_representative: "Territory orders, retailer visits, journey execution",
  merchandiser: "Shelf compliance, planogram audits, stock checks",
  distributor: "Inventory, deliveries, credit, warehouse operations",
  warehouse_manager: "Stock management, dispatch, receiving operations",
  finance_manager: "Reconciliation, credit control, financial reporting",
  logistics_coordinator: "Route planning, fleet coordination, delivery tracking",
};

export const useFMCGRole = () => {
  const { user } = useAuth();
  const [fmcgRole, setFmcgRole] = useState<FMCGRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setFmcgRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("fmcg_team_members")
        .select("fmcg_role")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setFmcgRole(data.fmcg_role as FMCGRole);
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const setRole = async (role: FMCGRole) => {
    if (!user) return;

    const { error } = await supabase
      .from("fmcg_team_members")
      .upsert({
        user_id: user.id,
        fmcg_role: role,
        email: user.email,
        display_name: user.user_metadata?.full_name || user.email?.split("@")[0],
      }, { onConflict: "user_id" });

    if (!error) {
      setFmcgRole(role);
    }
    return { error };
  };

  return { fmcgRole, loading, setRole };
};
