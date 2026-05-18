import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CosmeticsRole =
  | "brand_ceo"
  | "brand_marketing_director"
  | "brand_product_manager"
  | "brand_training_manager"
  | "brand_beauty_advisor"
  | "distributor_owner"
  | "distributor_sales_manager"
  | "distributor_sales_rep"
  | "distributor_warehouse_manager"
  | "distributor_finance_manager"
  | "retailer_store_owner"
  | "retailer_counter_manager"
  | "retailer_procurement"
  | "salon_owner"
  | "logistics_fleet_manager"
  | "logistics_delivery_driver"
  | "platform_admin"
  | "investor_viewer";

export const COSMETICS_ROLE_LABELS: Record<CosmeticsRole, string> = {
  brand_ceo: "Beauty Brand CEO",
  brand_marketing_director: "Marketing Director",
  brand_product_manager: "Product Manager",
  brand_training_manager: "Training Manager",
  brand_beauty_advisor: "Beauty Advisor",
  distributor_owner: "Distributor Owner",
  distributor_sales_manager: "Sales Manager",
  distributor_sales_rep: "Sales Representative",
  distributor_warehouse_manager: "Warehouse Manager",
  distributor_finance_manager: "Finance Manager",
  retailer_store_owner: "Store Owner",
  retailer_counter_manager: "Counter Manager",
  retailer_procurement: "Procurement Officer",
  salon_owner: "Salon / Spa Owner",
  logistics_fleet_manager: "Fleet Manager",
  logistics_delivery_driver: "Delivery Driver",
  platform_admin: "Platform Admin",
  investor_viewer: "Investor Viewer",
};

export const COSMETICS_ROLE_DESCRIPTIONS: Record<CosmeticsRole, string> = {
  brand_ceo: "Full platform - campaign ROI, brand performance, market intelligence",
  brand_marketing_director: "Campaign management, influencer analytics, beauty trends",
  brand_product_manager: "Product catalog, shade analytics, SKU performance",
  brand_training_manager: "Beauty advisor training, certification, performance",
  brand_beauty_advisor: "Counter visits, promoter tracking, shelf compliance",
  distributor_owner: "Distribution operations, inventory, credit, fleet",
  distributor_sales_manager: "Store coverage, territory analytics, rep management",
  distributor_sales_rep: "Store visits, order capture, merchandising",
  distributor_warehouse_manager: "Stock management, beauty product storage, dispatch",
  distributor_finance_manager: "Reconciliation, credit control, financial reporting",
  retailer_store_owner: "Store operations, ordering, inventory management",
  retailer_counter_manager: "Counter performance, stock checks, beauty advisory",
  retailer_procurement: "Supplier management, ordering, cost control",
  salon_owner: "Salon operations, product ordering, treatment inventory",
  logistics_fleet_manager: "Fleet operations, delivery logistics",
  logistics_delivery_driver: "Delivery execution, proof of delivery",
  platform_admin: "Full system administration",
  investor_viewer: "Platform metrics and growth analytics",
};

export type CosmeticsRoleCategory = "brand" | "distributor" | "retailer" | "salon" | "logistics" | "platform";

export const COSMETICS_ROLE_CATEGORIES: Record<CosmeticsRoleCategory, { label: string; roles: CosmeticsRole[] }> = {
  brand: {
    label: "Beauty Brand",
    roles: ["brand_ceo", "brand_marketing_director", "brand_product_manager", "brand_training_manager", "brand_beauty_advisor"],
  },
  distributor: {
    label: "Beauty Distributor",
    roles: ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_warehouse_manager", "distributor_finance_manager"],
  },
  retailer: {
    label: "Retail / Counter",
    roles: ["retailer_store_owner", "retailer_counter_manager", "retailer_procurement"],
  },
  salon: {
    label: "Salon / Spa",
    roles: ["salon_owner"],
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

export const useCosmeticsRole = () => {
  const { user } = useAuth();
  const [cosmeticsRole, setCosmeticsRole] = useState<CosmeticsRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) { setCosmeticsRole(null); setLoading(false); return; }
      const { data, error } = await supabase
        .from("cosmetics_team_members")
        .select("cosmetics_role")
        .eq("user_id", user.id)
        .single();
      if (!error && data) setCosmeticsRole(data.cosmetics_role as CosmeticsRole);
      setLoading(false);
    };
    fetchRole();
  }, [user]);

  const setRole = async (role: CosmeticsRole) => {
    if (!user) return;
    const { error } = await supabase
      .from("cosmetics_team_members")
      .upsert({ user_id: user.id, cosmetics_role: role, email: user.email, display_name: user.user_metadata?.full_name || user.email?.split("@")[0] }, { onConflict: "user_id" });
    if (!error) setCosmeticsRole(role);
    return { error };
  };

  return { cosmeticsRole, loading, setRole };
};
