import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ConsumerRole =
  | "manufacturer_ceo"
  | "manufacturer_sales_director"
  | "manufacturer_brand_manager"
  | "manufacturer_sales_rep"
  | "manufacturer_merchandiser"
  | "manufacturer_supply_chain"
  | "distributor_owner"
  | "distributor_sales_manager"
  | "distributor_sales_rep"
  | "distributor_warehouse_manager"
  | "distributor_finance_manager"
  | "retailer_owner"
  | "retailer_store_manager"
  | "retailer_procurement"
  | "wholesaler_owner"
  | "wholesaler_procurement"
  | "logistics_fleet_manager"
  | "logistics_delivery_driver"
  | "platform_admin"
  | "investor_viewer";

export const CONSUMER_ROLE_LABELS: Record<ConsumerRole, string> = {
  manufacturer_ceo: "Consumer Goods CEO",
  manufacturer_sales_director: "Sales Director",
  manufacturer_brand_manager: "Brand Manager",
  manufacturer_sales_rep: "Sales Representative",
  manufacturer_merchandiser: "Merchandiser",
  manufacturer_supply_chain: "Supply Chain Director",
  distributor_owner: "Distributor Owner",
  distributor_sales_manager: "Sales Manager",
  distributor_sales_rep: "Sales Representative",
  distributor_warehouse_manager: "Warehouse Manager",
  distributor_finance_manager: "Finance Manager",
  retailer_owner: "Retailer Owner",
  retailer_store_manager: "Store Manager",
  retailer_procurement: "Procurement Officer",
  wholesaler_owner: "Wholesaler Owner",
  wholesaler_procurement: "Wholesaler Procurement",
  logistics_fleet_manager: "Fleet Manager",
  logistics_delivery_driver: "Delivery Driver",
  platform_admin: "Platform Admin",
  investor_viewer: "Investor Viewer",
};

export const CONSUMER_ROLE_DESCRIPTIONS: Record<ConsumerRole, string> = {
  manufacturer_ceo: "Full platform - SKU analytics, distribution metrics, market intelligence",
  manufacturer_sales_director: "Sales strategy, territory management, distributor oversight",
  manufacturer_brand_manager: "Brand performance, campaigns, shelf share analytics",
  manufacturer_sales_rep: "Retailer visits, order capture, merchandising execution",
  manufacturer_merchandiser: "Shelf compliance, planogram audits, stock checks",
  manufacturer_supply_chain: "Production planning, demand forecasting, logistics",
  distributor_owner: "Distribution operations, inventory, credit, fleet",
  distributor_sales_manager: "Retailer coverage, territory analytics, rep management",
  distributor_sales_rep: "Retailer visits, order capture, territory execution",
  distributor_warehouse_manager: "Stock management, dispatch, receiving operations",
  distributor_finance_manager: "Reconciliation, credit control, financial reporting",
  retailer_owner: "Retail operations, ordering, inventory management",
  retailer_store_manager: "Daily operations, stock management, sales tracking",
  retailer_procurement: "Supplier management, ordering, cost control",
  wholesaler_owner: "Wholesale operations, bulk ordering, distribution",
  wholesaler_procurement: "Bulk purchasing, supplier negotiations",
  logistics_fleet_manager: "Fleet operations, delivery logistics",
  logistics_delivery_driver: "Delivery execution, proof of delivery",
  platform_admin: "Full system administration",
  investor_viewer: "Platform metrics and growth analytics",
};

export type ConsumerRoleCategory = "manufacturer" | "distributor" | "retailer" | "wholesaler" | "logistics" | "platform";

export const CONSUMER_ROLE_CATEGORIES: Record<ConsumerRoleCategory, { label: string; roles: ConsumerRole[] }> = {
  manufacturer: {
    label: "Consumer Goods Manufacturer",
    roles: ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_brand_manager", "manufacturer_sales_rep", "manufacturer_merchandiser", "manufacturer_supply_chain"],
  },
  distributor: {
    label: "Distributor",
    roles: ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_warehouse_manager", "distributor_finance_manager"],
  },
  retailer: {
    label: "Retailer",
    roles: ["retailer_owner", "retailer_store_manager", "retailer_procurement"],
  },
  wholesaler: {
    label: "Wholesaler",
    roles: ["wholesaler_owner", "wholesaler_procurement"],
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

export const useConsumerRole = () => {
  const { user } = useAuth();
  const [consumerRole, setConsumerRole] = useState<ConsumerRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) { setConsumerRole(null); setLoading(false); return; }
      const { data, error } = await supabase
        .from("consumer_team_members")
        .select("consumer_role")
        .eq("user_id", user.id)
        .single();
      if (!error && data) setConsumerRole(data.consumer_role as ConsumerRole);
      setLoading(false);
    };
    fetchRole();
  }, [user]);

  const setRole = async (role: ConsumerRole) => {
    if (!user) return;
    const { error } = await supabase
      .from("consumer_team_members")
      .upsert({ user_id: user.id, consumer_role: role, email: user.email, display_name: user.user_metadata?.full_name || user.email?.split("@")[0] }, { onConflict: "user_id" });
    if (!error) setConsumerRole(role);
    return { error };
  };

  return { consumerRole, loading, setRole };
};
