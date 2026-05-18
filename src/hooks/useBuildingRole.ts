import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BuildingRole =
  | "manufacturer_ceo"
  | "manufacturer_sales_director"
  | "manufacturer_sales_engineer"
  | "manufacturer_product_manager"
  | "manufacturer_supply_chain"
  | "distributor_owner"
  | "distributor_sales_manager"
  | "distributor_sales_rep"
  | "distributor_warehouse_manager"
  | "distributor_finance_manager"
  | "dealer_owner"
  | "dealer_store_manager"
  | "dealer_procurement"
  | "contractor_project_manager"
  | "contractor_procurement"
  | "contractor_site_engineer"
  | "logistics_fleet_manager"
  | "logistics_heavy_vehicle_operator"
  | "logistics_delivery_driver"
  | "platform_admin"
  | "investor_viewer";

export const BUILDING_ROLE_LABELS: Record<BuildingRole, string> = {
  manufacturer_ceo: "Building Materials CEO",
  manufacturer_sales_director: "Sales Director",
  manufacturer_sales_engineer: "Sales Engineer",
  manufacturer_product_manager: "Product Manager",
  manufacturer_supply_chain: "Supply Chain Director",
  distributor_owner: "Distributor Owner",
  distributor_sales_manager: "Sales Manager",
  distributor_sales_rep: "Sales Representative",
  distributor_warehouse_manager: "Warehouse Manager",
  distributor_finance_manager: "Finance Manager",
  dealer_owner: "Dealer Owner",
  dealer_store_manager: "Store Manager",
  dealer_procurement: "Procurement Officer",
  contractor_project_manager: "Project Manager",
  contractor_procurement: "Contractor Procurement",
  contractor_site_engineer: "Site Engineer",
  logistics_fleet_manager: "Fleet Manager",
  logistics_heavy_vehicle_operator: "Heavy Vehicle Operator",
  logistics_delivery_driver: "Delivery Driver",
  platform_admin: "Platform Admin",
  investor_viewer: "Investor Viewer",
};

export const BUILDING_ROLE_DESCRIPTIONS: Record<BuildingRole, string> = {
  manufacturer_ceo: "Full platform access - project pipeline, market intelligence",
  manufacturer_sales_director: "Sales strategy, dealer management, project tracking",
  manufacturer_sales_engineer: "Technical sales, quotations, site visits",
  manufacturer_product_manager: "Product specs, material certifications, catalog",
  manufacturer_supply_chain: "Production planning, bulk materials, logistics",
  distributor_owner: "Distribution operations, inventory, credit, fleet",
  distributor_sales_manager: "Dealer coverage, project tracking, rep management",
  distributor_sales_rep: "Site visits, order capture, quotation management",
  distributor_warehouse_manager: "Bulk storage, dispatch, receiving operations",
  distributor_finance_manager: "Project billing, credit control, financial reporting",
  dealer_owner: "Dealer operations, ordering, contractor relationships",
  dealer_store_manager: "Daily operations, stock management, walk-in sales",
  dealer_procurement: "Supplier management, bulk ordering, cost control",
  contractor_project_manager: "Project-based ordering, material scheduling",
  contractor_procurement: "Multi-project procurement, vendor management",
  contractor_site_engineer: "Site delivery coordination, material verification",
  logistics_fleet_manager: "Fleet operations, heavy vehicle management",
  logistics_heavy_vehicle_operator: "Crane/truck operations, bulk deliveries",
  logistics_delivery_driver: "Delivery execution, proof of delivery",
  platform_admin: "Full system administration",
  investor_viewer: "Platform metrics and growth analytics",
};

export type BuildingRoleCategory = "manufacturer" | "distributor" | "dealer" | "contractor" | "logistics" | "platform";

export const BUILDING_ROLE_CATEGORIES: Record<BuildingRoleCategory, { label: string; roles: BuildingRole[] }> = {
  manufacturer: {
    label: "Building Materials Manufacturer",
    roles: ["manufacturer_ceo", "manufacturer_sales_director", "manufacturer_sales_engineer", "manufacturer_product_manager", "manufacturer_supply_chain"],
  },
  distributor: {
    label: "Materials Distributor",
    roles: ["distributor_owner", "distributor_sales_manager", "distributor_sales_rep", "distributor_warehouse_manager", "distributor_finance_manager"],
  },
  dealer: {
    label: "Materials Dealer",
    roles: ["dealer_owner", "dealer_store_manager", "dealer_procurement"],
  },
  contractor: {
    label: "Contractor / Builder",
    roles: ["contractor_project_manager", "contractor_procurement", "contractor_site_engineer"],
  },
  logistics: {
    label: "Logistics Partner",
    roles: ["logistics_fleet_manager", "logistics_heavy_vehicle_operator", "logistics_delivery_driver"],
  },
  platform: {
    label: "Platform",
    roles: ["platform_admin", "investor_viewer"],
  },
};

export const useBuildingRole = () => {
  const { user } = useAuth();
  const [buildingRole, setBuildingRole] = useState<BuildingRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) { setBuildingRole(null); setLoading(false); return; }
      const { data, error } = await supabase
        .from("building_team_members")
        .select("building_role")
        .eq("user_id", user.id)
        .single();
      if (!error && data) setBuildingRole(data.building_role as BuildingRole);
      setLoading(false);
    };
    fetchRole();
  }, [user]);

  const setRole = async (role: BuildingRole) => {
    if (!user) return;
    const { error } = await supabase
      .from("building_team_members")
      .upsert({ user_id: user.id, building_role: role, email: user.email, display_name: user.user_metadata?.full_name || user.email?.split("@")[0] }, { onConflict: "user_id" });
    if (!error) setBuildingRole(role);
    return { error };
  };

  return { buildingRole, loading, setRole };
};
