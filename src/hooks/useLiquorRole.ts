import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type LiquorRole =
  | "distributor_owner"
  | "distributor_sales_manager"
  | "distributor_sales_rep"
  | "distributor_warehouse_manager"
  | "distributor_finance_manager"
  | "distributor_logistics_manager"
  | "supplier_brand_owner"
  | "supplier_sales_director"
  | "supplier_trade_marketing"
  | "supplier_market_analyst"
  | "supplier_distribution_manager"
  | "retailer_bar_owner"
  | "retailer_restaurant_owner"
  | "retailer_procurement_manager"
  | "retailer_store_manager"
  | "logistics_fleet_manager"
  | "logistics_delivery_driver"
  | "logistics_route_planner"
  | "platform_admin"
  | "data_intelligence_customer"
  | "investor_viewer";

export const LIQUOR_ROLE_LABELS: Record<LiquorRole, string> = {
  distributor_owner: "Distributor Owner / CEO",
  distributor_sales_manager: "Distributor Sales Manager",
  distributor_sales_rep: "Distributor Sales Rep",
  distributor_warehouse_manager: "Warehouse Manager",
  distributor_finance_manager: "Finance Manager",
  distributor_logistics_manager: "Logistics Manager",
  supplier_brand_owner: "Brand Owner",
  supplier_sales_director: "Supplier Sales Director",
  supplier_trade_marketing: "Trade Marketing Manager",
  supplier_market_analyst: "Market Analyst",
  supplier_distribution_manager: "Distribution Manager",
  retailer_bar_owner: "Bar Owner",
  retailer_restaurant_owner: "Restaurant Owner",
  retailer_procurement_manager: "Procurement Manager",
  retailer_store_manager: "Liquor Store Manager",
  logistics_fleet_manager: "Fleet Manager",
  logistics_delivery_driver: "Delivery Driver",
  logistics_route_planner: "Route Planner",
  platform_admin: "Platform Admin",
  data_intelligence_customer: "Data Intelligence Subscriber",
  investor_viewer: "Investor Dashboard Viewer",
};

export const LIQUOR_ROLE_DESCRIPTIONS: Record<LiquorRole, string> = {
  distributor_owner: "Full platform access - GMV, network analytics, revenue engines",
  distributor_sales_manager: "Sales team management, retailer analytics, trade promotions",
  distributor_sales_rep: "Territory orders, bar visits, journey execution",
  distributor_warehouse_manager: "Stock management, case dispatch, receiving operations",
  distributor_finance_manager: "Reconciliation, credit control, financial reporting",
  distributor_logistics_manager: "Fleet coordination, route planning, delivery tracking",
  supplier_brand_owner: "Brand performance, distributor network, demand engine",
  supplier_sales_director: "Distribution strategy, territory coverage, sales analytics",
  supplier_trade_marketing: "Promotion campaigns, retailer incentives, ROI analytics",
  supplier_market_analyst: "Market intelligence, demand signals, competitive analysis",
  supplier_distribution_manager: "Allocation management, distributor ordering, inventory flow",
  retailer_bar_owner: "Bar ordering, credit management, promotion access",
  retailer_restaurant_owner: "Restaurant ordering, inventory management, supplier deals",
  retailer_procurement_manager: "Multi-location ordering, vendor management, cost control",
  retailer_store_manager: "Store inventory, daily orders, shelf management",
  logistics_fleet_manager: "Fleet operations, driver management, route optimization",
  logistics_delivery_driver: "Delivery execution, proof of delivery, route navigation",
  logistics_route_planner: "Route planning, delivery scheduling, capacity planning",
  platform_admin: "Full system administration, compliance, revenue analytics",
  data_intelligence_customer: "Market reports, brand analytics, retail network insights",
  investor_viewer: "Platform metrics, ARR dashboards, network growth analytics",
};

export type LiquorRoleCategory = "distributor" | "supplier" | "retailer" | "logistics" | "platform";

export const LIQUOR_ROLE_CATEGORIES: Record<LiquorRoleCategory, { label: string; roles: LiquorRole[] }> = {
  distributor: {
    label: "Distributor",
    roles: ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_warehouse_manager", "distributor_finance_manager", "distributor_logistics_manager"],
  },
  supplier: {
    label: "Supplier / Brand",
    roles: ["supplier_brand_owner", "supplier_sales_director", "supplier_trade_marketing", "supplier_market_analyst", "supplier_distribution_manager"],
  },
  retailer: {
    label: "Retailer / Bar / Restaurant",
    roles: ["retailer_bar_owner", "retailer_restaurant_owner", "retailer_procurement_manager", "retailer_store_manager"],
  },
  logistics: {
    label: "Logistics Partner",
    roles: ["logistics_fleet_manager", "logistics_delivery_driver", "logistics_route_planner"],
  },
  platform: {
    label: "Platform",
    roles: ["platform_admin", "data_intelligence_customer", "investor_viewer"],
  },
};

export const useLiquorRole = () => {
  const { user } = useAuth();
  const [liquorRole, setLiquorRole] = useState<LiquorRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setLiquorRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("liquor_team_members")
        .select("liquor_role")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setLiquorRole(data.liquor_role as LiquorRole);
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const setRole = async (role: LiquorRole) => {
    if (!user) return;

    const { error } = await supabase
      .from("liquor_team_members")
      .upsert({
        user_id: user.id,
        liquor_role: role,
        email: user.email,
        display_name: user.user_metadata?.full_name || user.email?.split("@")[0],
      }, { onConflict: "user_id" });

    if (!error) {
      setLiquorRole(role);
    }
    return { error };
  };

  return { liquorRole, loading, setRole };
};
