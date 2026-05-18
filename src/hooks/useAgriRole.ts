import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AgriRole =
  | "manufacturer_ceo"
  | "manufacturer_product_manager"
  | "manufacturer_agronomist"
  | "manufacturer_field_officer"
  | "manufacturer_regulatory"
  | "manufacturer_supply_chain"
  | "distributor_owner"
  | "distributor_sales_manager"
  | "distributor_field_agent"
  | "distributor_warehouse_manager"
  | "distributor_finance_manager"
  | "dealer_owner"
  | "dealer_store_manager"
  | "dealer_procurement"
  | "cooperative_manager"
  | "cooperative_extension_officer"
  | "logistics_fleet_manager"
  | "logistics_delivery_driver"
  | "platform_admin"
  | "investor_viewer";

export const AGRI_ROLE_LABELS: Record<AgriRole, string> = {
  manufacturer_ceo: "Agri-Input Manufacturer CEO",
  manufacturer_product_manager: "Product Manager",
  manufacturer_agronomist: "Chief Agronomist",
  manufacturer_field_officer: "Field Extension Officer",
  manufacturer_regulatory: "Regulatory Affairs",
  manufacturer_supply_chain: "Supply Chain Director",
  distributor_owner: "Distributor Owner",
  distributor_sales_manager: "Sales Manager",
  distributor_field_agent: "Field Agent",
  distributor_warehouse_manager: "Warehouse Manager",
  distributor_finance_manager: "Finance Manager",
  dealer_owner: "Agro-Dealer Owner",
  dealer_store_manager: "Store Manager",
  dealer_procurement: "Procurement Officer",
  cooperative_manager: "Cooperative Manager",
  cooperative_extension_officer: "Extension Officer",
  logistics_fleet_manager: "Fleet Manager",
  logistics_delivery_driver: "Delivery Driver",
  platform_admin: "Platform Admin",
  investor_viewer: "Investor Viewer",
};

export const AGRI_ROLE_DESCRIPTIONS: Record<AgriRole, string> = {
  manufacturer_ceo: "Full platform access - crop-cycle intelligence, market analytics",
  manufacturer_product_manager: "Product portfolio, seasonal planning, input formulations",
  manufacturer_agronomist: "Crop science, demo plots, farmer advisory, soil analytics",
  manufacturer_field_officer: "Farmer visits, demo plots, field trials, adoption tracking",
  manufacturer_regulatory: "Product registration, safety certificates, compliance",
  manufacturer_supply_chain: "Production planning, batch tracking, distribution",
  distributor_owner: "Distribution operations, inventory, credit, fleet",
  distributor_sales_manager: "Dealer coverage, territory analytics, rep management",
  distributor_field_agent: "Dealer visits, farmer engagement, order capture",
  distributor_warehouse_manager: "Stock management, seasonal storage, dispatch",
  distributor_finance_manager: "Reconciliation, credit control, seasonal financing",
  dealer_owner: "Agro-dealer operations, ordering, farmer sales",
  dealer_store_manager: "Daily operations, stock management, farmer advisory",
  dealer_procurement: "Supplier management, seasonal ordering, cost control",
  cooperative_manager: "Cooperative operations, member management, bulk ordering",
  cooperative_extension_officer: "Farmer training, crop advisory, input adoption tracking",
  logistics_fleet_manager: "Fleet operations, rural delivery logistics",
  logistics_delivery_driver: "Delivery execution, proof of delivery",
  platform_admin: "Full system administration",
  investor_viewer: "Platform metrics and growth analytics",
};

export type AgriRoleCategory = "manufacturer" | "distributor" | "dealer" | "cooperative" | "logistics" | "platform";

export const AGRI_ROLE_CATEGORIES: Record<AgriRoleCategory, { label: string; roles: AgriRole[] }> = {
  manufacturer: {
    label: "Agri-Input Manufacturer",
    roles: ["manufacturer_ceo", "manufacturer_product_manager", "manufacturer_agronomist", "manufacturer_field_officer", "manufacturer_regulatory", "manufacturer_supply_chain"],
  },
  distributor: {
    label: "Agri Distributor",
    roles: ["distributor_owner", "distributor_sales_manager", "distributor_field_agent", "distributor_warehouse_manager", "distributor_finance_manager"],
  },
  dealer: {
    label: "Agro-Dealer",
    roles: ["dealer_owner", "dealer_store_manager", "dealer_procurement"],
  },
  cooperative: {
    label: "Farmer Cooperative",
    roles: ["cooperative_manager", "cooperative_extension_officer"],
  },
  logistics: {
    label: "Logistics Partner",
    roles: ["logistics_fleet_manager", "logistics_delivery_driver"],
  },
  platform: {
    label: "Platform",
    roles: ["platform_admin", "investor_viewer"],
  },
};

export const useAgriRole = () => {
  const { user } = useAuth();
  const [agriRole, setAgriRole] = useState<AgriRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) { setAgriRole(null); setLoading(false); return; }
      const { data, error } = await supabase
        .from("agri_team_members")
        .select("agri_role")
        .eq("user_id", user.id)
        .single();
      if (!error && data) setAgriRole(data.agri_role as AgriRole);
      setLoading(false);
    };
    fetchRole();
  }, [user]);

  const setRole = async (role: AgriRole) => {
    if (!user) return;
    const { error } = await supabase
      .from("agri_team_members")
      .upsert({ user_id: user.id, agri_role: role, email: user.email, display_name: user.user_metadata?.full_name || user.email?.split("@")[0] }, { onConflict: "user_id" });
    if (!error) setAgriRole(role);
    return { error };
  };

  return { agriRole, loading, setRole };
};
